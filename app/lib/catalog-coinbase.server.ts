/**
 * Coinbase catalog client — the I/O boundary for the coin catalog. This is the
 * ONLY file here that knows Coinbase's `/products` wire format; the search/rank
 * logic in `catalog.ts` stays provider-agnostic. To swap providers, reimplement
 * `fetchCatalog` to return `CatalogCoin[]` and keep the signature.
 *
 * The products list changes slowly, so the full catalog is cached for ~5
 * minutes (one shared entry) — repeated searches reuse it instead of refiring
 * the request and tripping Coinbase's ~10 req/s/IP limit. The response is
 * validated through a type guard (see `coinbase.ts`'s `isRatesResponse`); a bad
 * status or shape throws a clear Error so the route can degrade gracefully.
 */

import { TtlCache } from "~/lib/ttl-cache";
import type { CatalogCoin } from "~/lib/catalog";

const PRODUCTS_URL = "https://api.exchange.coinbase.com/products";

/** Catalog is slow-moving; reuse it across requests for 5 minutes. */
const CATALOG_TTL_MS = 5 * 60_000;

/** Single shared cache entry, keyed by a constant since there is one catalog. */
const CATALOG_KEY = "catalog";

/**
 * Module-level cache: persists across loader invocations within one server
 * process. Per-instance only — a multi-instance deploy would want a shared
 * cache. Keyed by a single constant.
 */
const catalogCache = new TtlCache<string, CatalogCoin[]>(CATALOG_TTL_MS);

/**
 * Deterministic offline/E2E catalog. Returned when `E2E_MOCK === "1"` so tests
 * and restricted-egress environments never hit the network. Mirrors the
 * `E2E_MOCK` convention in `coinbase.ts`.
 */
const MOCK_CATALOG: readonly CatalogCoin[] = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "LTC", name: "Litecoin" },
  { symbol: "BCH", name: "Bitcoin Cash" },
  { symbol: "UNI", name: "Uniswap" },
  { symbol: "ATOM", name: "Cosmos" },
  { symbol: "FIL", name: "Filecoin" },
];

/**
 * The subset of Coinbase's product object we rely on. Coinbase returns many
 * more fields; we only read these. `trading_disabled`/`status` gate tradability.
 */
interface CoinbaseProduct {
  base_currency: string;
  quote_currency: string;
  status: string;
  trading_disabled: boolean;
  display_name?: string;
}

/** Narrow one unknown array element to a usable product. */
function isProduct(value: unknown): value is CoinbaseProduct {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.base_currency === "string" &&
    typeof v.quote_currency === "string" &&
    typeof v.status === "string" &&
    typeof v.trading_disabled === "boolean"
  );
}

/** Validate the top-level response shape: Coinbase returns a JSON array. */
function isProductsResponse(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Fetch the Coinbase product catalog and map it to provider-agnostic
 * `CatalogCoin`s. Filters to USD-quoted products that are online and tradable,
 * de-duplicates by symbol, and caches the result for `CATALOG_TTL_MS`.
 *
 * Throws on a non-OK status, an unparseable body, or an unexpected shape so the
 * caller can decide how to degrade.
 */
export async function fetchCatalog(signal?: AbortSignal): Promise<CatalogCoin[]> {
  // E2E / offline ONLY: deterministic fixtures, zero network calls.
  if (typeof process !== "undefined" && process.env.E2E_MOCK === "1") {
    return MOCK_CATALOG.map((c) => ({ ...c }));
  }

  const now = Date.now();
  const cached = catalogCache.get(CATALOG_KEY, now);
  if (cached) return cached;

  let response: Response;
  try {
    response = await fetch(PRODUCTS_URL, {
      signal,
      headers: { Accept: "application/json", "User-Agent": "crypto-dashboard" },
    });
  } catch (err) {
    throw new Error("Network error while fetching the Coinbase catalog", {
      cause: err,
    });
  }

  if (!response.ok) {
    throw new Error(
      `Coinbase products API returned ${response.status} ${response.statusText}`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    throw new Error("Could not parse Coinbase products response", { cause: err });
  }

  if (!isProductsResponse(body)) {
    throw new Error("Unexpected Coinbase products response shape");
  }

  const seen = new Set<string>();
  const catalog: CatalogCoin[] = [];
  for (const item of body) {
    if (!isProduct(item)) continue;
    if (item.quote_currency !== "USD") continue;
    if (item.status !== "online" || item.trading_disabled) continue;

    const symbol = item.base_currency;
    if (seen.has(symbol)) continue;
    seen.add(symbol);

    catalog.push({
      symbol,
      name: item.display_name ?? symbol,
    });
  }

  catalogCache.set(CATALOG_KEY, catalog, now);
  return catalog;
}
