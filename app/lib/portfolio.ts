/**
 * Pure portfolio profit/loss math. No React, no I/O — safe to unit-test in
 * isolation (see app/tests/portfolio.test.ts).
 *
 * Convention: `costBasis` is the TOTAL USD paid for the position (quantity ×
 * the per-unit buy price), NOT a per-unit price. This keeps the invested figure
 * a simple sum across holdings and avoids re-deriving it from quantity.
 *
 * Everything here is null-safe: a holding whose current price is unavailable
 * (coin missing from the rate table) yields `null` market value / P&L rather
 * than a bogus number, mirroring how the dashboard surfaces missing rates.
 */

/** A simulated buy recorded by the user. */
export interface Holding {
  /** Ticker symbol, e.g. "BTC". Stable identity. */
  symbol: string;
  /** Units held (> 0). */
  quantity: number;
  /** Total USD paid for this position (quantity × per-unit buy price). */
  costBasis: number;
}

/** A holding enriched with current price and derived P&L figures. */
export interface HoldingPnL extends Holding {
  /** Display name, e.g. "Bitcoin". */
  name: string;
  /** Current USD price per unit, or `null` when unavailable. */
  currentPrice: number | null;
  /** quantity × currentPrice, or `null` when price is unavailable. */
  marketValue: number | null;
  /** marketValue − costBasis, or `null` when price is unavailable. */
  pnl: number | null;
  /** P&L as a percentage of cost basis, or `null` when undeterminable. */
  pnlPct: number | null;
}

/** Aggregate totals across the whole portfolio. */
export interface PortfolioTotals {
  rows: HoldingPnL[];
  /** Sum of cost bases (always determinable). */
  invested: number;
  /**
   * Sum of market values across holdings with a known price. Holdings whose
   * price is unavailable are excluded from this sum (they contribute `null`
   * per-row), so this reflects only the priced portion of the portfolio.
   */
  marketValue: number;
  /** marketValue − (cost basis of the priced holdings). */
  totalPnl: number;
  /** totalPnl as a percentage of the priced holdings' cost basis, or `null`. */
  totalPnlPct: number | null;
}

/**
 * Compute the P&L for a single holding against a current price. Null-safe: a
 * `null` price (or non-finite) yields null market value / P&L. `pnlPct` is null
 * when the cost basis is zero (can't divide by zero) but P&L itself is still
 * reported.
 */
export function computePnL(
  holding: Holding,
  currentPrice: number | null,
  name: string,
): HoldingPnL {
  const priced = currentPrice !== null && Number.isFinite(currentPrice);
  const marketValue = priced ? holding.quantity * currentPrice : null;
  const pnl = marketValue === null ? null : marketValue - holding.costBasis;
  const pnlPct =
    pnl === null || holding.costBasis === 0
      ? null
      : (pnl / holding.costBasis) * 100;
  return {
    ...holding,
    name,
    currentPrice: priced ? currentPrice : null,
    marketValue,
    pnl,
    pnlPct,
  };
}

/**
 * Map every holding to a HoldingPnL and aggregate the totals. Pure and
 * non-mutating — inputs are read-only and never modified.
 *
 * `priceBySymbol` / `nameBySymbol` map a symbol to its current price / display
 * name; a missing symbol degrades to a null price / the symbol itself as name.
 */
export function computePortfolio(
  holdings: readonly Holding[],
  priceBySymbol: Readonly<Record<string, number | null>>,
  nameBySymbol: Readonly<Record<string, string>>,
): PortfolioTotals {
  const rows = holdings.map((h) =>
    computePnL(h, priceBySymbol[h.symbol] ?? null, nameBySymbol[h.symbol] ?? h.symbol),
  );

  const invested = rows.reduce((sum, r) => sum + r.costBasis, 0);

  // Aggregate only the priced rows so an unpriced holding doesn't distort the
  // totals (it would otherwise look like a 100% loss).
  let marketValue = 0;
  let pricedCost = 0;
  for (const r of rows) {
    if (r.marketValue !== null) {
      marketValue += r.marketValue;
      pricedCost += r.costBasis;
    }
  }
  const totalPnl = marketValue - pricedCost;
  const totalPnlPct = pricedCost === 0 ? null : (totalPnl / pricedCost) * 100;

  return { rows, invested, marketValue, totalPnl, totalPnlPct };
}
