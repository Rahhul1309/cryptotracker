import { TRACKED_CURRENCIES } from "~/lib/crypto-config";

/** Skeleton grid shown while the very first load is in flight. */
export function LoadingSkeleton() {
  return (
    <ul
      className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading cryptocurrencies"
    >
      {TRACKED_CURRENCIES.map((c) => (
        <li
          key={c.symbol}
          className="panel shimmer h-[188px] rounded-2xl"
        />
      ))}
    </ul>
  );
}

/** Error state with a retry affordance. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="panel flex flex-col items-center gap-4 rounded-2xl p-12 text-center"
      style={{ borderColor: "color-mix(in srgb, var(--down) 45%, var(--line))" }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "color-mix(in srgb, var(--down) 18%, transparent)" }}
      >
        <svg className="h-6 w-6" viewBox="0 0 20 20" fill="var(--down)" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 1.5 18.5 17h-17L10 1.5Zm0 5a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0v-3a1 1 0 0 0-1-1Zm0 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold">
          Couldn’t load exchange rates
        </h2>
        <p className="mt-1.5 max-w-md text-sm text-ink-1">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl px-5 py-2.5 text-sm font-semibold text-bg-0 shadow-lg transition hover:brightness-110"
        style={{ background: "var(--gold)" }}
      >
        Try again
      </button>
    </div>
  );
}

/** Empty state for an empty watchlist. */
export function EmptyWatchlist() {
  return (
    <div className="panel p-12 text-center text-ink-1">
      <div className="mx-auto mb-3 text-3xl" style={{ color: "var(--accent)" }}>
        ★
      </div>
      <p className="font-display text-lg">Your watchlist is empty</p>
      <p className="mt-1 text-sm text-ink-2">
        Tap the star on any coin to follow it here.
      </p>
    </div>
  );
}

/** Empty state when a filter matches nothing. */
export function NoResults({ query }: { query: string }) {
  return (
    <div className="panel rounded-2xl border-dashed p-12 text-center text-ink-1">
      <p className="font-display text-lg">No matches for “{query}”</p>
      <p className="mt-1 text-sm text-ink-2">
        Try a ticker like BTC, or a name like Solana.
      </p>
    </div>
  );
}
