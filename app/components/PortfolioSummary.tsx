import type { PortfolioTotals } from "~/lib/portfolio";
import { formatPct, formatUsd } from "~/lib/format";

/**
 * Presentational portfolio totals. Pure UI: receives computed totals via props,
 * contains no business logic or I/O. Mirrors the dashboard's StatBar styling.
 */

function Stat({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral" | "gold";
  sub?: string;
}) {
  const color =
    tone === "up"
      ? "var(--up)"
      : tone === "down"
        ? "var(--down)"
        : tone === "gold"
          ? "var(--gold)"
          : "var(--ink-0)";
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-2">
        {label}
      </span>
      <span
        className="font-mono-num text-2xl font-semibold leading-none"
        style={{ color }}
      >
        {value}
      </span>
      {sub ? (
        <span className="font-mono-num text-xs text-ink-1">{sub}</span>
      ) : null}
    </div>
  );
}

export function PortfolioSummary({
  totals,
}: {
  totals: PortfolioTotals;
}): JSX.Element {
  const { invested, marketValue, totalPnl, totalPnlPct } = totals;
  const pnlTone = totalPnl > 0 ? "up" : totalPnl < 0 ? "down" : "neutral";

  return (
    <div className="panel grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-2xl sm:grid-cols-4 sm:divide-y-0">
      <Stat label="Invested" value={formatUsd(invested)} tone="gold" />
      <Stat label="Current Value" value={formatUsd(marketValue)} />
      <Stat
        label="Total P/L"
        value={formatUsd(totalPnl)}
        tone={pnlTone}
        sub={totalPnlPct === null ? undefined : formatPct(totalPnlPct)}
      />
      <Stat
        label="Return"
        value={formatPct(totalPnlPct)}
        tone={pnlTone}
      />
    </div>
  );
}
