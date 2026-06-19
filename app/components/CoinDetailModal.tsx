import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { CryptoRate } from "~/types/crypto";
import { InteractiveChart } from "~/components/InteractiveChart";
import { RollingNumber } from "~/components/RollingNumber";
import { formatBtc, formatPct, formatUsd } from "~/lib/format";

/**
 * Animated detail modal for a single coin. Opens with a spring scale/fade,
 * dims + blurs the backdrop, traps Escape-to-close, and shows a large live
 * chart + 24h stats. The price keeps updating live (RollingNumber) because it
 * reads from the same merged `crypto` row the grid uses.
 */
function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-2/60 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-2">
        {label}
      </div>
      <div
        className="mt-1 font-mono-num text-lg font-semibold"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export function CoinDetailModal({
  crypto,
  onClose,
}: {
  crypto: CryptoRate | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const positive = (crypto?.change24h ?? 0) >= 0;
  const spark = crypto?.spark ?? null;
  const high = spark ? Math.max(...spark) : null;
  const low = spark ? Math.min(...spark) : null;

  return (
    <AnimatePresence>
      {crypto ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${crypto.name} details`}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

          <motion.div
            className="panel relative z-10 w-full max-w-lg overflow-hidden rounded-3xl p-6"
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--gold), transparent)",
              }}
            />

            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">{crypto.name}</h2>
                <span className="text-sm uppercase tracking-wider text-ink-1">
                  {crypto.symbol} · USD
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-2 transition hover:bg-bg-2 hover:text-ink-0"
              >
                <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex items-end gap-3">
              <RollingNumber
                value={crypto.usd}
                formatted={formatUsd(crypto.usd)}
                className="font-mono-num text-4xl font-bold"
              />
              <span
                className="mb-1 font-mono-num text-sm font-semibold"
                style={{ color: positive ? "var(--up)" : "var(--down)" }}
              >
                {formatPct(crypto.change24h)}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-bg-2/40 p-3">
              <InteractiveChart data={spark} positive={positive} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Price (BTC)" value={formatBtc(crypto.btc)} />
              <Stat
                label="24h High"
                value={formatUsd(high)}
                tone="var(--up)"
              />
              <Stat label="24h Low" value={formatUsd(low)} tone="var(--down)" />
            </div>

            <p className="mt-4 text-center text-xs text-ink-2">
              Live price via Coinbase WebSocket · press Esc to close
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
