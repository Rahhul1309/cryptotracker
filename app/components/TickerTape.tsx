import { formatPct, formatUsd } from "~/lib/format";
import type { CryptoRate } from "~/types/crypto";

/**
 * Infinite scrolling ticker strip — classic trading-terminal feel. The track is
 * rendered twice back-to-back and translated -50% so the loop is seamless.
 * Pauses on hover. Presentational only.
 */
export function TickerTape({ rates }: { rates: CryptoRate[] }) {
  if (rates.length === 0) return null;
  // Duplicate the list so the -50% translate lands on an identical frame.
  const track = [...rates, ...rates];

  return (
    <div className="marquee-paused relative overflow-hidden border-y border-line bg-bg-1/60 py-2 backdrop-blur">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg-0 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg-0 to-transparent" />

      <div
        className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap"
        style={{ ["--marquee-duration" as string]: `${Math.max(rates.length * 3.5, 28)}s` }}
      >
        {track.map((c, i) => {
          const positive = (c.change24h ?? 0) >= 0;
          return (
            <span
              key={`${c.symbol}-${i}`}
              className="inline-flex items-center gap-2 text-sm"
            >
              <span className="font-semibold text-ink-0">{c.symbol}</span>
              <span className="font-mono-num text-ink-1">
                {formatUsd(c.usd)}
              </span>
              <span
                className="font-mono-num text-xs font-semibold"
                style={{ color: positive ? "var(--up)" : "var(--down)" }}
              >
                {positive ? "▲" : "▼"} {formatPct(c.change24h).replace("+", "")}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
