import type { CryptoRate, LivePriceMap } from "~/types/crypto";

/**
 * Pure overlay of live WebSocket prices onto the loader's rate rows. No I/O.
 *
 * For each row, if a live tick exists we replace `usd`, recompute `btc` from
 * live USD prices (X in BTC = usd(X) / usd(BTC)), and recompute `change24h`
 * from the tick's `open24h`. Rows without a live tick are returned unchanged,
 * so the display degrades to loader data seamlessly while the socket warms up
 * or for any symbol the feed doesn't cover. The sparkline (`spark`) always
 * comes from loader candle history — the live feed only moves the numbers.
 */
export function mergeLivePrices(
  rates: readonly CryptoRate[],
  live: LivePriceMap,
): CryptoRate[] {
  const liveBtcUsd = live["BTC"]?.usd ?? null;

  return rates.map((row) => {
    const tick = live[row.symbol];
    if (!tick) return row;

    const usd = tick.usd;
    const isBtc = row.symbol === "BTC";
    const btc =
      isBtc || liveBtcUsd === null || liveBtcUsd <= 0
        ? isBtc
          ? null
          : row.btc // fall back to loader BTC value if no live BTC price yet
        : usd / liveBtcUsd;

    const change24h =
      tick.open24h > 0 ? ((usd - tick.open24h) / tick.open24h) * 100 : row.change24h;

    return { ...row, usd, btc, change24h };
  });
}
