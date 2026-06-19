import { forwardRef, useEffect, useRef, useState } from "react";
import type { CryptoRate } from "~/types/crypto";
import { formatBtc, formatPct, formatUsd } from "~/lib/format";
import { Sparkline } from "~/components/Sparkline";
import { RollingNumber } from "~/components/RollingNumber";
import { usePriceFlash } from "~/hooks/usePriceFlash";
import { useTilt } from "~/hooks/useTilt";
import { useDisplaySettings } from "~/hooks/settings-context";

interface CryptoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  crypto: CryptoRate;
  /** 1-based position in the current (visible) list — shown as a rank chip. */
  rank?: number;
  /** Drag handle props supplied by the sortable wrapper. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  /** Opens the detail modal for this coin. */
  onOpen?: (symbol: string) => void;
  /** Whether this coin is on the watchlist. */
  watched?: boolean;
  /** Toggles the coin's watchlist membership. */
  onToggleWatch?: (symbol: string) => void;
  /** If provided, the coin is user-added and can be removed from tracking. */
  onUntrack?: (symbol: string) => void;
}

/** Two-letter glyph used as a coin avatar (no external icon dependency). */
function CoinGlyph({ symbol, positive }: { symbol: string; positive: boolean }) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold font-mono-num"
      style={{
        borderColor: "var(--line)",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--gold) 16%, transparent), transparent)",
        color: positive ? "var(--gold-soft)" : "var(--ink-0)",
      }}
      aria-hidden="true"
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

/**
 * Presentational crypto card with the flashy treatment: 3D tilt-on-hover, a
 * glow pulse on price updates, an odometer price, and click-to-open detail.
 *
 * Layering note: the OUTER node carries dnd-kit's transform (from the sortable
 * wrapper via `style`), so tilt is applied to an INNER element to avoid the two
 * transforms fighting. Drag listeners live only on the handle button.
 */
export const CryptoCard = forwardRef<HTMLDivElement, CryptoCardProps>(
  function CryptoCard(
    {
      crypto,
      rank,
      dragHandleProps,
      isDragging = false,
      onOpen,
      watched = false,
      onToggleWatch,
      onUntrack,
      className = "",
      ...rest
    },
    ref,
  ) {
    const { precision, showSparklines, showBtcColumn, density } =
      useDisplaySettings();
    const compact = density === "compact";
    const flash = usePriceFlash(crypto.usd);
    const positive = (crypto.change24h ?? 0) >= 0;
    const flashClass =
      flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : "";
    const tilt = useTilt(7);

    // Glow pulse on the whole card when the price changes. Color follows the
    // TICK direction (up→green / down→red), not the 24h trend — otherwise a coin
    // down on the day flashed red even on an up-tick (the reported bug).
    const [glow, setGlow] = useState<"up" | "down" | null>(null);
    const prevUsd = useRef(crypto.usd);
    useEffect(() => {
      const prev = prevUsd.current;
      if (prev !== null && crypto.usd !== null && crypto.usd !== prev) {
        setGlow(crypto.usd > prev ? "up" : "down");
        const id = window.setTimeout(() => setGlow(null), 1000);
        prevUsd.current = crypto.usd;
        return () => window.clearTimeout(id);
      }
      prevUsd.current = crypto.usd;
    }, [crypto.usd]);

    return (
      <div ref={ref} className={className} {...rest}>
        {/* inner = tilt target (keeps dnd transform on the outer node clean) */}
        <div
          ref={tilt.ref}
          onMouseMove={tilt.onMouseMove}
          onMouseLeave={tilt.onMouseLeave}
          onClick={() => onOpen?.(crypto.symbol)}
          style={{
            ...tilt.style,
            // Glow tint reflects the latest tick direction (green up / red down).
            ["--glow" as string]:
              glow === "up"
                ? "var(--up)"
                : glow === "down"
                  ? "var(--down)"
                  : "var(--accent)",
          }}
          className={`panel group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl ${
            compact ? "gap-2.5 p-3.5" : "gap-4 p-5"
          } ${glow ? "glow-pulse" : ""} ${
            isDragging ? "ring-1 ring-gold/60" : "hover:border-gold/40"
          }`}
          data-testid={`crypto-card-${crypto.symbol}`}
        >
          {/* top hairline accent that lights up on hover */}
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50 transition-opacity group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--gold), transparent)",
            }}
          />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <CoinGlyph symbol={crypto.symbol} positive={positive} />
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-semibold leading-tight">
                  {crypto.name}
                </h2>
                <div className="flex items-center gap-2">
                  {rank ? (
                    <span className="font-mono-num text-[11px] text-ink-2">
                      #{rank}
                    </span>
                  ) : null}
                  <span className="text-xs font-medium uppercase tracking-wider text-ink-1">
                    {crypto.symbol}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={
                watched
                  ? `Remove ${crypto.name} from watchlist`
                  : `Add ${crypto.name} to watchlist`
              }
              aria-pressed={watched}
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatch?.(crypto.symbol);
              }}
              className="rounded-lg p-1.5 transition hover:bg-bg-2"
              style={{ color: watched ? "var(--accent)" : "var(--ink-2)" }}
              title={watched ? "On watchlist" : "Add to watchlist"}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill={watched ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.96l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76z" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={`Drag to reorder ${crypto.name}`}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab touch-none rounded-lg p-1.5 text-ink-2 opacity-0 transition hover:bg-bg-2 hover:text-ink-0 focus:opacity-100 active:cursor-grabbing group-hover:opacity-100"
              {...dragHandleProps}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <circle cx="7" cy="5" r="1.5" />
                <circle cx="13" cy="5" r="1.5" />
                <circle cx="7" cy="10" r="1.5" />
                <circle cx="13" cy="10" r="1.5" />
                <circle cx="7" cy="15" r="1.5" />
                <circle cx="13" cy="15" r="1.5" />
              </svg>
            </button>
            {onUntrack ? (
              <button
                type="button"
                aria-label={`Stop tracking ${crypto.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onUntrack(crypto.symbol);
                }}
                className="rounded-lg p-1.5 text-ink-2 opacity-0 transition hover:bg-bg-2 hover:text-down focus:opacity-100 group-hover:opacity-100"
                title="Remove from tracking"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
            </div>
          </div>

          {showSparklines && !compact ? (
            <Sparkline data={crypto.spark} positive={positive} />
          ) : null}

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-ink-2">
                USD
              </div>
              <div
                className={`mt-0.5 rounded-md text-xl font-semibold leading-none transition-colors duration-500 ${flashClass}`}
                style={{
                  // Price text reflects last movement: green up, red down,
                  // neutral when flat/unchanged. Updates live on each tick.
                  color:
                    flash === "up"
                      ? "var(--up)"
                      : flash === "down"
                        ? "var(--down)"
                        : "var(--ink-0)",
                }}
              >
                <RollingNumber
                  value={crypto.usd}
                  formatted={formatUsd(crypto.usd, precision)}
                  className="font-mono-num"
                />
              </div>
              {showBtcColumn ? (
                <div className="mt-1.5 font-mono-num text-xs text-ink-1">
                  {formatBtc(crypto.btc)}
                </div>
              ) : null}
            </div>

            <span
              className="shrink-0 rounded-lg border px-2 py-1 font-mono-num text-sm font-semibold"
              style={{
                color:
                  crypto.change24h === null
                    ? "var(--ink-2)"
                    : positive
                      ? "var(--up)"
                      : "var(--down)",
                borderColor:
                  crypto.change24h === null
                    ? "var(--line)"
                    : positive
                      ? "color-mix(in srgb, var(--up) 40%, transparent)"
                      : "color-mix(in srgb, var(--down) 40%, transparent)",
                background:
                  crypto.change24h === null
                    ? "transparent"
                    : positive
                      ? "color-mix(in srgb, var(--up) 12%, transparent)"
                      : "color-mix(in srgb, var(--down) 12%, transparent)",
              }}
            >
              {formatPct(crypto.change24h)}
            </span>
          </div>
        </div>
      </div>
    );
  },
);
