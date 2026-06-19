import type { LiveStatus } from "~/types/crypto";

/**
 * Connection-status pill for the live price feed. Purely presentational — it
 * reflects the `status` from `useLivePrices`. Uses the design-system tokens so
 * it themes automatically.
 */
const CONFIG: Record<
  LiveStatus,
  { label: string; color: string; pulse: boolean }
> = {
  connecting: { label: "Connecting", color: "var(--gold)", pulse: true },
  live: { label: "Live", color: "var(--up)", pulse: true },
  reconnecting: { label: "Reconnecting", color: "var(--gold)", pulse: true },
  offline: { label: "Polling", color: "var(--ink-2)", pulse: false },
};

export function LiveBadge({ status }: { status: LiveStatus }) {
  const { label, color, pulse } = CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-1/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur"
      style={{ color }}
      role="status"
      aria-live="polite"
      title={`Price feed: ${label}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse ? (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: color }}
          />
        ) : null}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: color }}
        />
      </span>
      {label}
    </span>
  );
}
