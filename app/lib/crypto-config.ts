import type { CurrencyMeta } from "~/types/crypto";

/**
 * The curated list of cryptocurrencies shown on the dashboard.
 *
 * To add a coin: add an entry here with its Coinbase ticker `symbol` and a
 * display `name`. No other file needs to change — the loader fetches every
 * rate in one call and looks up these symbols. See CLAUDE.md → "Add a coin".
 *
 * `symbol` MUST match the code Coinbase uses in its exchange-rates response
 * (these are standard tickers). Order here is only the initial/default order;
 * users can reorder, and their order is persisted to localStorage.
 */
export const TRACKED_CURRENCIES: readonly CurrencyMeta[] = [
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
] as const;
