import type { CryptoRate, CurrencyMeta, MarketSnapshot } from "~/types/crypto";

/**
 * Pure rate + market math. No I/O, no React — trivially unit-testable.
 *
 * The USD/BTC prices come from Coinbase's "exchange-rates" map for base USD:
 *   { "BTC": "0.0000153", "ETH": "0.00031", ... }
 * where each value is "how many units of that currency equal 1 USD":
 *   - USD price of X  = 1 / rates[X]
 *   - BTC price of X  = rates[BTC] / rates[X]
 *
 * The 24h change + sparkline come from a separate per-symbol candle series.
 */

/** Parse a Coinbase string rate into a positive finite number, else null. */
export function parseRate(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** USD price for one unit of a currency given its per-USD rate. */
export function usdPrice(perUsdRate: number | null): number | null {
  if (perUsdRate === null) return null;
  return 1 / perUsdRate;
}

/**
 * BTC-denominated price for one unit of a currency.
 * Returns null for BTC itself (a coin's price in itself is trivially 1, but we
 * surface null so the UI can render it as "—").
 */
export function btcPrice(
  perUsdRate: number | null,
  btcPerUsdRate: number | null,
  isBtc: boolean,
): number | null {
  if (isBtc) return null;
  if (perUsdRate === null || btcPerUsdRate === null) return null;
  return btcPerUsdRate / perUsdRate;
}

/**
 * Percentage change between the first and last point of a price series.
 * Returns null if the series is too short or the base is non-positive.
 */
export function changePct(series: number[] | null): number | null {
  if (!series || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  if (first === undefined || last === undefined || first <= 0) return null;
  return ((last - first) / first) * 100;
}

/**
 * Map the raw per-USD rate table + a curated currency list into display rows.
 * `series` maps a symbol to its trailing hourly closes (oldest→newest).
 * Currencies missing from the table still appear, with null rates, so the UI
 * can show a graceful "unavailable" state rather than dropping the card.
 */
export function buildRates(
  currencies: readonly CurrencyMeta[],
  perUsdRates: Record<string, string>,
  series: Record<string, number[]> = {},
): CryptoRate[] {
  const btcRate = parseRate(perUsdRates["BTC"]);
  return currencies.map((c) => {
    const rate = parseRate(perUsdRates[c.symbol]);
    const isBtc = c.symbol === "BTC";
    const spark = series[c.symbol] ?? null;
    return {
      ...c,
      usd: usdPrice(rate),
      btc: btcPrice(rate, btcRate, isBtc),
      change24h: changePct(spark),
      spark,
    };
  });
}

/** Compute the aggregate header snapshot from the per-asset rows. */
export function buildSnapshot(rates: readonly CryptoRate[]): MarketSnapshot {
  const withChange = rates.filter(
    (r): r is CryptoRate & { change24h: number } => r.change24h !== null,
  );

  const avgChange24h =
    withChange.length === 0
      ? null
      : withChange.reduce((sum, r) => sum + r.change24h, 0) / withChange.length;

  let topGainer: MarketSnapshot["topGainer"] = null;
  let topLoser: MarketSnapshot["topLoser"] = null;
  for (const r of withChange) {
    if (!topGainer || r.change24h > topGainer.change24h) {
      topGainer = { symbol: r.symbol, change24h: r.change24h };
    }
    if (!topLoser || r.change24h < topLoser.change24h) {
      topLoser = { symbol: r.symbol, change24h: r.change24h };
    }
  }

  return { assetCount: rates.length, avgChange24h, topGainer, topLoser };
}
