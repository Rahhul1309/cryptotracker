/**
 * Domain types for the crypto dashboard.
 *
 * Keep these provider-agnostic: nothing here should reference Coinbase
 * specifically. The Coinbase-shaped responses are defined in `lib/coinbase.ts`
 * and mapped into these types, so swapping data providers only touches that
 * one file. See CLAUDE.md → "Swapping the data provider".
 */

/** A currency we want to display, independent of any live rate. */
export interface CurrencyMeta {
  /** Ticker symbol, e.g. "BTC". Used as the stable identity for ordering. */
  symbol: string;
  /** Human-readable name, e.g. "Bitcoin". */
  name: string;
}

/** A currency enriched with its current rates and recent trend. */
export interface CryptoRate extends CurrencyMeta {
  /** Price of one unit in USD. `null` when the provider had no rate. */
  usd: number | null;
  /** Price of one unit denominated in BTC. `null` for BTC itself or if missing. */
  btc: number | null;
  /** Percentage change over the trailing ~24h, or null if unavailable. */
  change24h: number | null;
  /** Trailing hourly close prices (oldest→newest) for the sparkline, or null. */
  spark: number[] | null;
}

/** Aggregate market snapshot shown in the header stat bar. */
export interface MarketSnapshot {
  assetCount: number;
  /** Mean of available 24h change percentages. */
  avgChange24h: number | null;
  /** Best performer over 24h, if any change data exists. */
  topGainer: { symbol: string; change24h: number } | null;
  /** Worst performer over 24h, if any change data exists. */
  topLoser: { symbol: string; change24h: number } | null;
}

/** Shape returned by the dashboard loader. */
export interface DashboardData {
  rates: CryptoRate[];
  snapshot: MarketSnapshot;
  /** ISO timestamp of when rates were fetched (server clock). */
  fetchedAt: string;
}

/** Connection state of the live (WebSocket) price feed. */
export type LiveStatus = "connecting" | "live" | "reconnecting" | "offline";

/** A single live price tick parsed from the provider's WS feed. */
export interface LiveTick {
  symbol: string;
  /** Latest trade price in USD. */
  usd: number;
  /** Open price 24h ago in USD — used to derive 24h change live. */
  open24h: number;
}

/** Map of symbol → latest live tick, kept by the live-price hook. */
export type LivePriceMap = Record<string, LiveTick>;
