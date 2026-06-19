import type { CryptoRate } from "~/types/crypto";
import { Sparkline } from "~/components/Sparkline";
import { formatPct, formatUsd } from "~/lib/format";

/**
 * Pick the best gainer and worst loser. Only a coin that is actually UP (>0)
 * qualifies as a gainer, and only one actually DOWN (<0) as a loser — so we
 * never label a coin that fell as the "top gainer".
 */
export function pickSpotlight(rates: readonly CryptoRate[]): {
  gainer: CryptoRate | null;
  loser: CryptoRate | null;
} {
  let gainer: CryptoRate | null = null;
  let loser: CryptoRate | null = null;
  for (const r of rates) {
    if (r.change24h === null) continue;
    if (r.change24h > 0 && (!gainer || r.change24h > gainer.change24h!)) {
      gainer = r;
    }
    if (r.change24h < 0 && (!loser || r.change24h < loser.change24h!)) {
      loser = r;
    }
  }
  return { gainer, loser };
}

function SpotlightCard({
  rate,
  kind,
  onOpen,
}: {
  rate: CryptoRate;
  kind: "gainer" | "loser";
  onOpen?: (symbol: string) => void;
}) {
  const positive = (rate.change24h ?? 0) >= 0;
  const color = positive ? "var(--up)" : "var(--down)";
  return (
    <button
      type="button"
      onClick={() => onOpen?.(rate.symbol)}
      className="panel group relative flex flex-col gap-3 overflow-hidden p-5 text-left transition hover:border-gold/40"
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ background: color, opacity: 0.7 }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">
          {kind === "gainer" ? "▲ Top Gainer · 24h" : "▼ Top Loser · 24h"}
        </span>
        <span
          className="font-mono-num text-sm font-bold"
          style={{ color }}
        >
          {formatPct(rate.change24h)}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="font-head text-xl font-bold leading-none">
            {rate.name}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-ink-1">
            {rate.symbol}
          </div>
        </div>
        <div className="font-mono-num text-lg font-semibold">
          {formatUsd(rate.usd)}
        </div>
      </div>

      {/* Larger chart than the small cards (height 96 vs ~56). */}
      <div className="-mx-1">
        <Sparkline data={rate.spark} positive={positive} width={520} height={96} />
      </div>
    </button>
  );
}

/**
 * A prominent two-up spotlight of the day's best and worst performers, with
 * charts noticeably larger than the regular grid cards. Hidden when there's no
 * change data to rank.
 */
export function Spotlight({
  rates,
  onOpen,
}: {
  rates: readonly CryptoRate[];
  onOpen?: (symbol: string) => void;
}) {
  const { gainer, loser } = pickSpotlight(rates);
  if (!gainer && !loser) return null;
  return (
    <section
      aria-label="Top movers"
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      {gainer ? (
        <SpotlightCard rate={gainer} kind="gainer" onOpen={onOpen} />
      ) : null}
      {loser ? (
        <SpotlightCard rate={loser} kind="loser" onOpen={onOpen} />
      ) : null}
    </section>
  );
}
