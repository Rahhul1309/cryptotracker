import { describe, expect, it } from "vitest";
import { mergeLivePrices } from "~/lib/live-merge";
import type { CryptoRate, LivePriceMap } from "~/types/crypto";

const baseRates: CryptoRate[] = [
  { symbol: "BTC", name: "Bitcoin", usd: 50_000, btc: null, change24h: 1, spark: [1, 2] },
  { symbol: "ETH", name: "Ethereum", usd: 2_000, btc: 0.04, change24h: 2, spark: [3, 4] },
  { symbol: "SOL", name: "Solana", usd: 100, btc: 0.002, change24h: -1, spark: [5, 6] },
];

describe("mergeLivePrices", () => {
  it("returns rows unchanged when there are no live ticks", () => {
    expect(mergeLivePrices(baseRates, {})).toEqual(baseRates);
  });

  it("overlays live USD and recomputes BTC from live BTC price", () => {
    const live: LivePriceMap = {
      BTC: { symbol: "BTC", usd: 60_000, open24h: 58_000 },
      ETH: { symbol: "ETH", usd: 3_000, open24h: 2_700 },
    };
    const merged = mergeLivePrices(baseRates, live);
    const btc = merged.find((r) => r.symbol === "BTC")!;
    const eth = merged.find((r) => r.symbol === "ETH")!;

    expect(btc.usd).toBe(60_000);
    expect(btc.btc).toBeNull(); // BTC in BTC stays null
    expect(eth.usd).toBe(3_000);
    expect(eth.btc).toBeCloseTo(3_000 / 60_000); // 0.05
  });

  it("recomputes 24h change from the tick's open24h", () => {
    const live: LivePriceMap = {
      ETH: { symbol: "ETH", usd: 2_700, open24h: 2_700 },
    };
    const eth = mergeLivePrices(baseRates, live).find((r) => r.symbol === "ETH")!;
    expect(eth.change24h).toBeCloseTo(0); // price == open → 0%

    const live2: LivePriceMap = {
      ETH: { symbol: "ETH", usd: 2_970, open24h: 2_700 },
    };
    const eth2 = mergeLivePrices(baseRates, live2).find((r) => r.symbol === "ETH")!;
    expect(eth2.change24h).toBeCloseTo(10); // +10%
  });

  it("keeps loader spark history regardless of live data", () => {
    const live: LivePriceMap = { ETH: { symbol: "ETH", usd: 9_999, open24h: 1 } };
    const eth = mergeLivePrices(baseRates, live).find((r) => r.symbol === "ETH")!;
    expect(eth.spark).toEqual([3, 4]);
  });

  it("falls back to loader BTC value when no live BTC price yet", () => {
    const live: LivePriceMap = {
      ETH: { symbol: "ETH", usd: 2_500, open24h: 2_500 },
    };
    const eth = mergeLivePrices(baseRates, live).find((r) => r.symbol === "ETH")!;
    // No BTC tick → can't recompute, keep prior btc value.
    expect(eth.btc).toBe(0.04);
  });

  it("does not mutate the input rows", () => {
    const snapshot = JSON.parse(JSON.stringify(baseRates));
    mergeLivePrices(baseRates, {
      ETH: { symbol: "ETH", usd: 1, open24h: 1 },
    });
    expect(baseRates).toEqual(snapshot);
  });
});
