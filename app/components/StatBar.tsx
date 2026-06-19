import type { MarketSnapshot } from "~/types/crypto";
import { formatPct } from "~/lib/format";

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
      <span className="font-mono-num text-2xl font-semibold leading-none" style={{ color }}>
        {value}
      </span>
      {sub ? (
        <span className="font-mono-num text-xs text-ink-1">{sub}</span>
      ) : null}
    </div>
  );
}

/** Empty-state cell when there's no qualifying gainer/loser. */
function EmptyStat({ label, message }: { label: string; message: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-2">
        {label}
      </span>
      <span className="text-sm text-ink-2">{message}</span>
    </div>
  );
}

/**
 * Live market snapshot. "Avg 24h" was removed (an average across unrelated coins
 * isn't meaningful). Top gainer only shows when a coin is ACTUALLY up (>0); top
 * loser only when a coin is actually down (<0). If none qualify, an explanatory
 * empty state is shown instead of a misleading green/red figure.
 */
export function StatBar({ snapshot }: { snapshot: MarketSnapshot }) {
  const { topGainer, topLoser } = snapshot;
  const hasGainer = topGainer !== null && topGainer.change24h > 0;
  const hasLoser = topLoser !== null && topLoser.change24h < 0;

  return (
    <div className="panel grid grid-cols-1 divide-y divide-line overflow-hidden rounded-2xl sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      {hasGainer ? (
        <Stat
          label="Top Gainer · 24h"
          value={topGainer.symbol}
          sub={formatPct(topGainer.change24h)}
          tone="up"
        />
      ) : (
        <EmptyStat label="Top Gainer · 24h" message="No coins up right now" />
      )}
      {hasLoser ? (
        <Stat
          label="Top Loser · 24h"
          value={topLoser.symbol}
          sub={formatPct(topLoser.change24h)}
          tone="down"
        />
      ) : (
        <EmptyStat label="Top Loser · 24h" message="No coins down right now" />
      )}
    </div>
  );
}
