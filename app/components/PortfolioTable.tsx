import { Form } from "@remix-run/react";
import type { HoldingPnL } from "~/lib/portfolio";
import { formatPct, formatUsd } from "~/lib/format";

/**
 * Presentational table of holdings with derived P&L. Pure UI: rows in via
 * props; the only interactive piece is a per-row remove form that posts back to
 * the route action (intent `remove` + the row index). No business logic here.
 */

function pnlColor(value: number | null): string {
  if (value === null || value === 0) return "var(--ink-2)";
  return value > 0 ? "var(--up)" : "var(--down)";
}

export function PortfolioTable({
  rows,
}: {
  rows: HoldingPnL[];
}): JSX.Element {
  if (rows.length === 0) {
    return (
      <div className="panel rounded-2xl px-6 py-12 text-center text-ink-2">
        No simulated holdings yet. Add a buy above to track its profit/loss.
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden rounded-2xl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.14em] text-ink-2">
            <th className="px-4 py-3 font-medium">Asset</th>
            <th className="px-4 py-3 text-right font-medium">Quantity</th>
            <th className="px-4 py-3 text-right font-medium">Cost Basis</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium">Value</th>
            <th className="px-4 py-3 text-right font-medium">P/L</th>
            <th className="px-4 py-3 text-right font-medium">P/L %</th>
            <th className="px-4 py-3" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.symbol}-${index}`}
              className="border-b border-line last:border-b-0"
            >
              <td className="px-4 py-3">
                <span className="font-display font-semibold text-ink-0">
                  {row.symbol}
                </span>
                <span className="ml-2 text-xs text-ink-2">{row.name}</span>
              </td>
              <td className="font-mono-num px-4 py-3 text-right text-ink-1">
                {row.quantity}
              </td>
              <td className="font-mono-num px-4 py-3 text-right text-ink-1">
                {formatUsd(row.costBasis)}
              </td>
              <td className="font-mono-num px-4 py-3 text-right text-ink-1">
                {formatUsd(row.currentPrice)}
              </td>
              <td className="font-mono-num px-4 py-3 text-right text-ink-0">
                {formatUsd(row.marketValue)}
              </td>
              <td
                className="font-mono-num px-4 py-3 text-right"
                style={{ color: pnlColor(row.pnl) }}
              >
                {formatUsd(row.pnl)}
              </td>
              <td
                className="font-mono-num px-4 py-3 text-right"
                style={{ color: pnlColor(row.pnl) }}
              >
                {formatPct(row.pnlPct)}
              </td>
              <td className="px-4 py-3 text-right">
                <Form method="post">
                  <input type="hidden" name="_action" value="remove" />
                  <input type="hidden" name="index" value={index} />
                  <button
                    type="submit"
                    className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-1 transition hover:text-ink-0"
                    aria-label={`Remove ${row.symbol} holding`}
                  >
                    Remove
                  </button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
