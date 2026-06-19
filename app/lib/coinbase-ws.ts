import type { LiveTick } from "~/types/crypto";

/**
 * Pure helpers for the Coinbase WebSocket feed. No I/O, no React — the socket
 * itself lives in `app/hooks/useLivePrices.ts`. This file only builds the
 * subscribe payload and parses incoming frames, so the wire format is testable
 * in isolation and provider-swappable. See CLAUDE.md → "swap the data provider".
 *
 * Feed: wss://ws-feed.exchange.coinbase.com, public + unauthenticated.
 * The `ticker` channel pushes a message per trade carrying both the latest
 * `price` and `open_24h`, so live 24h change needs no candle history.
 */

export const COINBASE_WS_URL = "wss://ws-feed.exchange.coinbase.com";

/** "ETH" → "ETH-USD" (Coinbase product id for the USD book). */
export function toProductId(symbol: string): string {
  return `${symbol.toUpperCase()}-USD`;
}

/** "ETH-USD" → "ETH". Returns null if it isn't a *-USD product id. */
export function fromProductId(productId: string): string | null {
  const match = /^([A-Z0-9]+)-USD$/.exec(productId.toUpperCase());
  return match ? match[1]! : null;
}

/** Build the subscribe frame for the ticker channel over the given symbols. */
export function buildSubscribeMessage(symbols: readonly string[]): string {
  return JSON.stringify({
    type: "subscribe",
    product_ids: symbols.map(toProductId),
    channels: ["ticker"],
  });
}

/** Build the matching unsubscribe frame (used on teardown if needed). */
export function buildUnsubscribeMessage(symbols: readonly string[]): string {
  return JSON.stringify({
    type: "unsubscribe",
    product_ids: symbols.map(toProductId),
    channels: ["ticker"],
  });
}

function toPositiveNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parse a raw WS frame (already JSON-parsed to `unknown`) into a LiveTick.
 * Returns null for anything that isn't a well-formed ticker message — heartbeat,
 * subscription ack, error frame, or malformed data all parse to null so callers
 * can ignore them safely.
 */
export function parseTicker(raw: unknown): LiveTick | null {
  if (typeof raw !== "object" || raw === null) return null;
  const msg = raw as Record<string, unknown>;
  if (msg.type !== "ticker") return null;
  if (typeof msg.product_id !== "string") return null;

  const symbol = fromProductId(msg.product_id);
  if (!symbol) return null;

  const usd = toPositiveNumber(msg.price);
  const open24h = toPositiveNumber(msg.open_24h);
  if (usd === null || open24h === null) return null;

  return { symbol, usd, open24h };
}
