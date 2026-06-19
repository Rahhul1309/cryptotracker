import { buildRates, buildSnapshot } from "~/lib/rates";
import type { CurrencyMeta, DashboardData } from "~/types/crypto";

/**
 * Deterministic mock dashboard data for E2E tests / offline runs. Makes NO
 * network calls. Pure (no `.server` suffix needed — only uses pure helpers).
 *
 * SAFETY: this is reached ONLY when the `E2E_MOCK=1` env var is set, which is
 * set exclusively by playwright.config.ts. A normal `npm run dev` / `npm start`
 * never sets it, so a real server always uses live Coinbase data — the mock
 * cannot leak into a real run.
 */

// A fixed per-USD rate table (units per 1 USD), like Coinbase's shape.
const MOCK_RATE_TABLE: Record<string, string> = {
  BTC: "0.0000148",
  ETH: "0.000301",
  SOL: "0.00662",
  XRP: "1.85",
  ADA: "2.27",
  DOGE: "7.94",
  AVAX: "0.0345",
  DOT: "0.196",
  LINK: "0.0571",
  MATIC: "1.96",
  LTC: "0.0123",
  BCH: "0.00219",
};

/** A gently varying synthetic 24h series so sparklines render. */
function mockSeries(symbol: string): number[] {
  const seed = symbol.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = 100 + (seed % 50);
  return Array.from({ length: 24 }, (_, i) => {
    const wave = Math.sin((i + seed) / 3) * (base * 0.04);
    return Number((base + wave + i * 0.15).toFixed(2));
  });
}

export function mockDashboard(
  currencies: readonly CurrencyMeta[],
): DashboardData {
  const series: Record<string, number[]> = {};
  for (const c of currencies) series[c.symbol] = mockSeries(c.symbol);
  const rates = buildRates(currencies, MOCK_RATE_TABLE, series);
  return {
    rates,
    snapshot: buildSnapshot(rates),
    // Fixed timestamp so tests are deterministic.
    fetchedAt: "2026-01-01T00:00:00.000Z",
  };
}
