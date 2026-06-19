import { formatTime } from "~/lib/format";

interface RefreshControlsProps {
  fetchedAt: string;
  isRefreshing: boolean;
  liveEnabled: boolean;
  onRefreshNow: () => void;
  onToggleLive: () => void;
}

/**
 * Last-updated time + manual refresh + a Live on/off switch.
 *
 * The Live switch is the master control for the WebSocket feed: on → real-time
 * ticks; off → the loader + interval polling keep the data fresh. (Settings now
 * lives in the prominent "Preferences" button in the header.)
 */
export function RefreshControls({
  fetchedAt,
  isRefreshing,
  liveEnabled,
  onRefreshNow,
  onToggleLive,
}: RefreshControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="flex items-center gap-1.5 font-mono-num text-xs text-ink-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${isRefreshing ? "animate-pulse" : ""}`}
          style={{ background: isRefreshing ? "var(--accent)" : "var(--up)" }}
        />
        {formatTime(fetchedAt)}
      </span>

      <button
        type="button"
        onClick={onRefreshNow}
        disabled={isRefreshing}
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg-1 px-3.5 py-2 text-sm font-medium text-ink-0 transition hover:border-gold/50 hover:text-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 3a7 7 0 0 0-6.32 4 1 1 0 0 0 1.8.86A5 5 0 0 1 15 10h-2l3 4 3-4h-2a7 7 0 0 0-7-7Z" />
          <path d="M10 17a7 7 0 0 0 6.32-4 1 1 0 1 0-1.8-.86A5 5 0 0 1 5 10h2L4 6 1 10h2a7 7 0 0 0 7 7Z" />
        </svg>
        {isRefreshing ? "Syncing…" : "Refresh"}
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={liveEnabled}
        onClick={onToggleLive}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-bg-1 px-3 py-2 text-sm transition hover:border-gold/50"
        title={liveEnabled ? "Live streaming on" : "Live streaming off"}
      >
        <span
          className="relative h-4 w-7 rounded-full transition-colors"
          style={{ background: liveEnabled ? "var(--accent)" : "var(--line-strong)" }}
        >
          <span
            className="absolute top-0.5 h-3 w-3 rounded-full bg-bg-0 transition-all"
            style={{ left: liveEnabled ? "0.875rem" : "0.125rem" }}
          />
        </span>
        <span className="text-ink-1">Live</span>
      </button>
    </div>
  );
}
