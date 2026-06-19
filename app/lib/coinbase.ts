import { buildRates, buildSnapshot } from "~/lib/rates";
import { TtlCache } from "~/lib/ttl-cache";
import { mockDashboard } from "~/lib/coinbase-mock";
import type {
  CurrencyMeta,
  CryptoRate,
  DashboardData,
} from "~/types/crypto";

/**
 * Coinbase data client. This is the ONLY file that knows the provider's wire
 * format. To swap providers, reimplement `fetchDashboard` to return
 * `DashboardData` and keep the signature. See CLAUDE.md.
 *
 * Two endpoints are used:
 *  1. exchange-rates  → spot USD/BTC prices for every symbol in ONE call.
 *  2. candles (per product) → trailing hourly closes for sparklines + 24h
 *     change. Fetched in parallel, best-effort: a symbol whose candles fail
 *     simply renders without a sparkline rather than failing the whole page.
 *
 * Rate-limit safety: candles are cached with a short TTL so a burst of loader
 * revalidations (e.g. a user mashing "Refresh") reuses cached series instead of
 * refiring ~12 requests each time and tripping Coinbase's ~10 req/s/IP limit.
 * The required rate-table call additionally retries once on a 429.
 */

const RATES_URL = "https://api.coinbase.com/v2/exchange-rates?currency=USD";
const CANDLES_BASE = "https://api.exchange.coinbase.com/products";
/** 3600s granularity = hourly candles; 24 of them ≈ one day of trend. */
const CANDLE_GRANULARITY = 3600;
const CANDLE_POINTS = 24;
/** Candles change slowly; reuse them across rapid refreshes for 60s. */
const CANDLE_TTL_MS = 60_000;

/**
 * Module-level cache: persists across loader invocations within one server
 * process. Per-instance only — a multi-instance deploy would want a shared
 * cache (noted in the plan). Keyed by symbol.
 */
const candleCache = new TtlCache<string, number[]>(CANDLE_TTL_MS);

export class RateFetchError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RateFetchError";
  }
}

interface CoinbaseRatesResponse {
  data: { currency: string; rates: Record<string, string> };
}

function isRatesResponse(value: unknown): value is CoinbaseRatesResponse {
  if (typeof value !== "object" || value === null) return false;
  const data = (value as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return false;
  const rates = (data as { rates?: unknown }).rates;
  return typeof rates === "object" && rates !== null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch the spot exchange-rate table (the one required call). Retries once on a
 * 429 (rate limited) after a short backoff before giving up, so a rapid refresh
 * burst doesn't flip the whole UI into the error state. Other failures throw
 * immediately so genuine outages still surface to the ErrorBoundary.
 */
async function fetchRateTable(
  signal?: AbortSignal,
  attempt = 0,
): Promise<Record<string, string>> {
  let response: Response;
  try {
    response = await fetch(RATES_URL, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    throw new RateFetchError("Network error while fetching exchange rates", err);
  }
  if (response.status === 429 && attempt < 1) {
    await delay(600);
    return fetchRateTable(signal, attempt + 1);
  }
  if (!response.ok) {
    throw new RateFetchError(
      `Coinbase API returned ${response.status} ${response.statusText}`,
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    throw new RateFetchError("Could not parse exchange-rate response", err);
  }
  if (!isRatesResponse(body)) {
    throw new RateFetchError("Unexpected exchange-rate response shape");
  }
  return body.data.rates;
}

/**
 * Fetch trailing hourly closes for one product (e.g. "BTC-USD").
 * Best-effort: returns null on any failure so the dashboard degrades per-card.
 * Coinbase candle rows are [time, low, high, open, close, volume], newest
 * first — we sort oldest→newest and take the closing price.
 */
async function fetchSeries(
  symbol: string,
  signal?: AbortSignal,
): Promise<number[] | null> {
  const url = `${CANDLES_BASE}/${symbol}-USD/candles?granularity=${CANDLE_GRANULARITY}`;
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json", "User-Agent": "crypto-dashboard" },
    });
    if (!res.ok) return null;
    const rows: unknown = await res.json();
    if (!Array.isArray(rows)) return null;
    const closes = rows
      .filter(
        (r): r is number[] =>
          Array.isArray(r) && r.length >= 5 && typeof r[4] === "number",
      )
      .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0))
      .slice(-CANDLE_POINTS)
      .map((r) => r[4] as number);
    return closes.length >= 2 ? closes : null;
  } catch {
    return null;
  }
}

/**
 * Candle fetch with TTL cache: returns the cached series if fresh, otherwise
 * fetches and caches. Cache misses on failure too (returns null) so we don't
 * hammer a flaky endpoint, but also don't poison the cache with nulls.
 */
async function getSeries(
  symbol: string,
  now: number,
  signal?: AbortSignal,
): Promise<number[] | null> {
  const cached = candleCache.get(symbol, now);
  if (cached) return cached;
  const fresh = await fetchSeries(symbol, signal);
  if (fresh) candleCache.set(symbol, fresh, now);
  return fresh;
}

/**
 * Fetch everything the dashboard needs. The rate table is required (its
 * failure throws); candle series are best-effort, cached, and parallelized.
 */
export async function fetchDashboard(
  currencies: readonly CurrencyMeta[],
  signal?: AbortSignal,
): Promise<DashboardData> {
  // E2E / offline ONLY: deterministic fixtures, zero network calls. Gated on an
  // env var set exclusively by playwright.config.ts — never in a real server.
  if (typeof process !== "undefined" && process.env.E2E_MOCK === "1") {
    return mockDashboard(currencies);
  }

  const now = Date.now();
  const [rateTable, seriesEntries] = await Promise.all([
    fetchRateTable(signal),
    Promise.all(
      currencies.map(async (c) => {
        const series = await getSeries(c.symbol, now, signal);
        return [c.symbol, series] as const;
      }),
    ),
  ]);

  const series: Record<string, number[]> = {};
  for (const [symbol, data] of seriesEntries) {
    if (data) series[symbol] = data;
  }

  const rates = buildRates(currencies, rateTable, series);
  return {
    rates,
    snapshot: buildSnapshot(rates),
    fetchedAt: new Date().toISOString(),
  };
}

/** Back-compat thin wrapper (used by tests / simple callers). */
export async function fetchRates(
  currencies: readonly CurrencyMeta[],
  signal?: AbortSignal,
): Promise<CryptoRate[]> {
  const { rates } = await fetchDashboard(currencies, signal);
  return rates;
}
