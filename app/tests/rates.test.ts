import { describe, expect, it } from "vitest";
import {
  buildRates,
  buildSnapshot,
  btcPrice,
  changePct,
  parseRate,
  usdPrice,
} from "~/lib/rates";
import type { CurrencyMeta } from "~/types/crypto";

describe("parseRate", () => {
  it("parses positive numeric strings", () => {
    expect(parseRate("0.5")).toBe(0.5);
    expect(parseRate("123")).toBe(123);
  });

  it("rejects non-positive, non-finite, and missing values", () => {
    expect(parseRate("0")).toBeNull();
    expect(parseRate("-1")).toBeNull();
    expect(parseRate("abc")).toBeNull();
    expect(parseRate(undefined)).toBeNull();
  });
});

describe("usdPrice", () => {
  it("inverts the per-USD rate", () => {
    expect(usdPrice(0.00002)).toBeCloseTo(50_000);
  });
  it("returns null for null input", () => {
    expect(usdPrice(null)).toBeNull();
  });
});

describe("btcPrice", () => {
  it("returns null for BTC itself", () => {
    expect(btcPrice(0.00002, 0.00002, true)).toBeNull();
  });
  it("computes price denominated in BTC", () => {
    // ETH: 0.0004/USD, BTC: 0.00002/USD → 0.00002 / 0.0004 = 0.05
    expect(btcPrice(0.0004, 0.00002, false)).toBeCloseTo(0.05);
  });
  it("returns null when either rate is missing", () => {
    expect(btcPrice(null, 0.00002, false)).toBeNull();
    expect(btcPrice(0.0004, null, false)).toBeNull();
  });
});

describe("changePct", () => {
  it("computes percentage change from first to last", () => {
    expect(changePct([100, 110])).toBeCloseTo(10);
    expect(changePct([100, 90])).toBeCloseTo(-10);
    expect(changePct([50, 60, 75])).toBeCloseTo(50);
  });
  it("returns null for short, missing, or non-positive-base series", () => {
    expect(changePct(null)).toBeNull();
    expect(changePct([100])).toBeNull();
    expect(changePct([0, 50])).toBeNull();
  });
});

describe("buildRates", () => {
  const currencies: CurrencyMeta[] = [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "MISSING", name: "Nope" },
  ];
  const perUsd = { BTC: "0.00002", ETH: "0.0004" };
  const series = { ETH: [2000, 2100, 2200] };

  it("derives usd and btc columns from a single rate table", () => {
    const result = buildRates(currencies, perUsd, series);
    const btc = result.find((r) => r.symbol === "BTC")!;
    const eth = result.find((r) => r.symbol === "ETH")!;

    expect(btc.usd).toBeCloseTo(50_000);
    expect(btc.btc).toBeNull();
    expect(eth.usd).toBeCloseTo(2_500);
    expect(eth.btc).toBeCloseTo(0.05);
  });

  it("derives 24h change + spark from the series, null when absent", () => {
    const result = buildRates(currencies, perUsd, series);
    const eth = result.find((r) => r.symbol === "ETH")!;
    const btc = result.find((r) => r.symbol === "BTC")!;
    expect(eth.spark).toEqual([2000, 2100, 2200]);
    expect(eth.change24h).toBeCloseTo(10);
    expect(btc.spark).toBeNull();
    expect(btc.change24h).toBeNull();
  });

  it("keeps currencies absent from the table with null rates", () => {
    const missing = buildRates(currencies, perUsd, series).find(
      (r) => r.symbol === "MISSING",
    )!;
    expect(missing.usd).toBeNull();
    expect(missing.btc).toBeNull();
  });

  it("preserves input order", () => {
    expect(buildRates(currencies, perUsd).map((r) => r.symbol)).toEqual([
      "BTC",
      "ETH",
      "MISSING",
    ]);
  });
});

describe("buildSnapshot", () => {
  const rows = buildRates(
    [
      { symbol: "BTC", name: "Bitcoin" },
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "SOL", name: "Solana" },
      { symbol: "DOT", name: "Polkadot" },
    ],
    { BTC: "0.00002", ETH: "0.0004", SOL: "0.01", DOT: "0.2" },
    {
      ETH: [100, 110], // +10%
      SOL: [100, 80], // -20%
      DOT: [100, 105], // +5%
      // BTC has no series → excluded from averages/extremes
    },
  );

  it("counts all assets but averages only those with change data", () => {
    const snap = buildSnapshot(rows);
    expect(snap.assetCount).toBe(4);
    // mean of +10, -20, +5 = -1.666…
    expect(snap.avgChange24h).toBeCloseTo((10 - 20 + 5) / 3);
  });

  it("identifies top gainer and loser", () => {
    const snap = buildSnapshot(rows);
    expect(snap.topGainer?.symbol).toBe("ETH");
    expect(snap.topLoser?.symbol).toBe("SOL");
  });

  it("returns nulls when no change data exists", () => {
    const snap = buildSnapshot(
      buildRates([{ symbol: "BTC", name: "Bitcoin" }], { BTC: "0.00002" }),
    );
    expect(snap.avgChange24h).toBeNull();
    expect(snap.topGainer).toBeNull();
    expect(snap.topLoser).toBeNull();
  });
});
