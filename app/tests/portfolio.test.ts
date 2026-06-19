import { describe, expect, it } from "vitest";
import {
  computePnL,
  computePortfolio,
  type Holding,
} from "~/lib/portfolio";

describe("computePnL", () => {
  it("computes a gain", () => {
    const h: Holding = { symbol: "BTC", quantity: 2, costBasis: 100 };
    const r = computePnL(h, 80, "Bitcoin");
    expect(r.name).toBe("Bitcoin");
    expect(r.currentPrice).toBe(80);
    expect(r.marketValue).toBe(160);
    expect(r.pnl).toBe(60);
    expect(r.pnlPct).toBe(60);
  });

  it("computes a loss", () => {
    const h: Holding = { symbol: "ETH", quantity: 1, costBasis: 200 };
    const r = computePnL(h, 150, "Ethereum");
    expect(r.marketValue).toBe(150);
    expect(r.pnl).toBe(-50);
    expect(r.pnlPct).toBe(-25);
  });

  it("computes a break-even (zero) position", () => {
    const h: Holding = { symbol: "SOL", quantity: 4, costBasis: 400 };
    const r = computePnL(h, 100, "Solana");
    expect(r.pnl).toBe(0);
    expect(r.pnlPct).toBe(0);
  });

  it("is null-safe when the price is unavailable (null)", () => {
    const h: Holding = { symbol: "XRP", quantity: 10, costBasis: 5 };
    const r = computePnL(h, null, "XRP");
    expect(r.currentPrice).toBeNull();
    expect(r.marketValue).toBeNull();
    expect(r.pnl).toBeNull();
    expect(r.pnlPct).toBeNull();
  });

  it("treats non-finite prices as unavailable", () => {
    const h: Holding = { symbol: "ADA", quantity: 1, costBasis: 1 };
    const r = computePnL(h, Number.NaN, "Cardano");
    expect(r.currentPrice).toBeNull();
    expect(r.marketValue).toBeNull();
  });

  it("reports P/L but null pct when cost basis is zero", () => {
    const h: Holding = { symbol: "DOGE", quantity: 100, costBasis: 0 };
    const r = computePnL(h, 1, "Dogecoin");
    expect(r.pnl).toBe(100);
    expect(r.pnlPct).toBeNull();
  });

  it("falls back to the symbol as name when none is given (via portfolio)", () => {
    const r = computePnL({ symbol: "BTC", quantity: 1, costBasis: 1 }, 2, "BTC");
    expect(r.name).toBe("BTC");
  });

  it("does not mutate its input holding", () => {
    const h: Holding = { symbol: "BTC", quantity: 1, costBasis: 10 };
    const snapshot = { ...h };
    computePnL(h, 20, "Bitcoin");
    expect(h).toEqual(snapshot);
  });

  it("respects quantity in market value (2 units vs 10 units of the same coin)", () => {
    // Same coin, same per-unit buy price ($50) and same current price ($60).
    // The 10-unit position must show 5x the market value and 5x the P&L of the
    // 2-unit position, while the P&L *percentage* is identical (price moved the
    // same %). This locks down that quantity flows through every figure.
    const small: Holding = { symbol: "BTC", quantity: 2, costBasis: 2 * 50 };
    const large: Holding = { symbol: "BTC", quantity: 10, costBasis: 10 * 50 };

    const rSmall = computePnL(small, 60, "Bitcoin");
    const rLarge = computePnL(large, 60, "Bitcoin");

    // marketValue = quantity * currentPrice
    expect(rSmall.marketValue).toBe(120); // 2 * 60
    expect(rLarge.marketValue).toBe(600); // 10 * 60
    expect(rLarge.marketValue! / rSmall.marketValue!).toBe(5);

    // pnl scales with quantity too
    expect(rSmall.pnl).toBe(20); // 120 - 100
    expect(rLarge.pnl).toBe(100); // 600 - 500
    expect(rLarge.pnl! / rSmall.pnl!).toBe(5);

    // pnlPct is per-unit-invariant (same price move) → identical for both sizes
    expect(rSmall.pnlPct).toBeCloseTo(20, 6);
    expect(rLarge.pnlPct).toBeCloseTo(20, 6);
  });

  it("scales market value linearly with quantity at a fixed price", () => {
    const price = 7;
    for (const quantity of [1, 3, 8, 12.5]) {
      const r = computePnL(
        { symbol: "ETH", quantity, costBasis: 0 },
        price,
        "Ethereum",
      );
      expect(r.marketValue).toBeCloseTo(quantity * price, 6);
    }
  });

  it("handles fractional quantity in market value and P&L", () => {
    const h: Holding = { symbol: "BTC", quantity: 0.5, costBasis: 30 };
    const r = computePnL(h, 80, "Bitcoin");
    expect(r.marketValue).toBe(40); // 0.5 * 80
    expect(r.pnl).toBe(10); // 40 - 30
    expect(r.pnlPct).toBeCloseTo((10 / 30) * 100, 6);
  });

  it("reports a negative (loss) P&L proportional to quantity", () => {
    const one: Holding = { symbol: "SOL", quantity: 1, costBasis: 100 };
    const three: Holding = { symbol: "SOL", quantity: 3, costBasis: 300 };
    const rOne = computePnL(one, 60, "Solana"); // value 60 -> -40
    const rThree = computePnL(three, 60, "Solana"); // value 180 -> -120
    expect(rOne.pnl).toBe(-40);
    expect(rThree.pnl).toBe(-120);
    expect(rThree.pnl! / rOne.pnl!).toBe(3);
    expect(rOne.pnlPct).toBeCloseTo(-40, 6);
    expect(rThree.pnlPct).toBeCloseTo(-40, 6);
  });
});

describe("computePortfolio", () => {
  const names = { BTC: "Bitcoin", ETH: "Ethereum", XRP: "XRP" };

  it("returns zeroed totals for an empty portfolio", () => {
    const t = computePortfolio([], {}, {});
    expect(t.rows).toEqual([]);
    expect(t.invested).toBe(0);
    expect(t.marketValue).toBe(0);
    expect(t.totalPnl).toBe(0);
    expect(t.totalPnlPct).toBeNull();
  });

  it("aggregates totals across holdings", () => {
    const holdings: Holding[] = [
      { symbol: "BTC", quantity: 2, costBasis: 100 }, // value 160 -> +60
      { symbol: "ETH", quantity: 1, costBasis: 200 }, // value 150 -> -50
    ];
    const prices = { BTC: 80, ETH: 150 };
    const t = computePortfolio(holdings, prices, names);
    expect(t.invested).toBe(300);
    expect(t.marketValue).toBe(310);
    expect(t.totalPnl).toBe(10);
    // 10 / 300 * 100
    expect(t.totalPnlPct).toBeCloseTo(3.3333, 4);
  });

  it("includes unpriced holdings in invested but excludes them from value/pnl", () => {
    const holdings: Holding[] = [
      { symbol: "BTC", quantity: 1, costBasis: 100 }, // priced: value 120
      { symbol: "XRP", quantity: 5, costBasis: 50 }, // unpriced
    ];
    const prices: Record<string, number | null> = { BTC: 120, XRP: null };
    const t = computePortfolio(holdings, prices, names);
    expect(t.invested).toBe(150); // both cost bases
    expect(t.marketValue).toBe(120); // only priced
    expect(t.totalPnl).toBe(20); // 120 - 100 (priced cost only)
    expect(t.totalPnlPct).toBeCloseTo(20, 4); // 20 / 100
    // per-row nullness preserved
    const xrpRow = t.rows.find((r) => r.symbol === "XRP");
    expect(xrpRow?.marketValue).toBeNull();
    expect(xrpRow?.pnl).toBeNull();
  });

  it("returns null totalPnlPct when no holding is priced", () => {
    const holdings: Holding[] = [{ symbol: "XRP", quantity: 5, costBasis: 50 }];
    const t = computePortfolio(holdings, { XRP: null }, names);
    expect(t.invested).toBe(50);
    expect(t.marketValue).toBe(0);
    expect(t.totalPnl).toBe(0);
    expect(t.totalPnlPct).toBeNull();
  });

  it("falls back to the symbol when no name mapping exists", () => {
    const holdings: Holding[] = [{ symbol: "UNI", quantity: 1, costBasis: 1 }];
    const t = computePortfolio(holdings, { UNI: 2 }, {});
    expect(t.rows[0]?.name).toBe("UNI");
  });

  it("treats a missing symbol in the price map as unpriced", () => {
    const holdings: Holding[] = [{ symbol: "BTC", quantity: 1, costBasis: 10 }];
    const t = computePortfolio(holdings, {}, names);
    expect(t.rows[0]?.currentPrice).toBeNull();
    expect(t.marketValue).toBe(0);
  });

  it("does not mutate the input holdings array", () => {
    const holdings: Holding[] = [{ symbol: "BTC", quantity: 1, costBasis: 10 }];
    const snapshot = JSON.parse(JSON.stringify(holdings));
    computePortfolio(holdings, { BTC: 20 }, names);
    expect(holdings).toEqual(snapshot);
  });

  it("totals reflect quantity: scaling a position scales market value and P&L", () => {
    // Two portfolios identical except the BTC quantity (and matching costBasis):
    // the larger position must produce proportionally larger value and P&L.
    const priceBtc = 120;
    const small = computePortfolio(
      [{ symbol: "BTC", quantity: 1, costBasis: 100 }],
      { BTC: priceBtc },
      names,
    );
    const large = computePortfolio(
      [{ symbol: "BTC", quantity: 4, costBasis: 400 }],
      { BTC: priceBtc },
      names,
    );
    expect(small.marketValue).toBe(120); // 1 * 120
    expect(large.marketValue).toBe(480); // 4 * 120
    expect(large.marketValue / small.marketValue).toBe(4);
    expect(small.totalPnl).toBe(20); // 120 - 100
    expect(large.totalPnl).toBe(80); // 480 - 400
    expect(large.totalPnl / small.totalPnl).toBe(4);
    // Same % return regardless of size (price moved +20%).
    expect(small.totalPnlPct).toBeCloseTo(20, 6);
    expect(large.totalPnlPct).toBeCloseTo(20, 6);
  });

  it("aggregates multiple holdings with differing quantities correctly", () => {
    const holdings: Holding[] = [
      { symbol: "BTC", quantity: 2, costBasis: 100 }, // value 2*80=160 -> +60
      { symbol: "ETH", quantity: 5, costBasis: 250 }, // value 5*40=200 -> -50
      { symbol: "XRP", quantity: 100, costBasis: 100 }, // value 100*1.5=150 -> +50
    ];
    const prices = { BTC: 80, ETH: 40, XRP: 1.5 };
    const t = computePortfolio(holdings, prices, names);
    expect(t.invested).toBe(450); // 100 + 250 + 100
    expect(t.marketValue).toBe(510); // 160 + 200 + 150
    expect(t.totalPnl).toBe(60); // 510 - 450
    expect(t.totalPnlPct).toBeCloseTo((60 / 450) * 100, 6);
    // Per-row figures each respect their own quantity.
    const btc = t.rows.find((r) => r.symbol === "BTC");
    const eth = t.rows.find((r) => r.symbol === "ETH");
    const xrp = t.rows.find((r) => r.symbol === "XRP");
    expect(btc?.marketValue).toBe(160);
    expect(eth?.marketValue).toBe(200);
    expect(xrp?.marketValue).toBe(150);
  });

  it("excludes an unpriced (quantity-bearing) holding from value but keeps its cost in invested", () => {
    const holdings: Holding[] = [
      { symbol: "BTC", quantity: 3, costBasis: 150 }, // priced: 3*70=210 -> +60
      { symbol: "ETH", quantity: 10, costBasis: 500 }, // unpriced
    ];
    const prices: Record<string, number | null> = { BTC: 70, ETH: null };
    const t = computePortfolio(holdings, prices, names);
    expect(t.invested).toBe(650); // both cost bases counted
    expect(t.marketValue).toBe(210); // only the priced BTC position
    expect(t.totalPnl).toBe(60); // 210 - 150 (priced cost only)
    expect(t.totalPnlPct).toBeCloseTo(40, 6); // 60 / 150
  });
});
