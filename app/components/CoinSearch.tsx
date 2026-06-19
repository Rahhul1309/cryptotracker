import { useEffect, useRef, useState } from "react";
import type { CatalogCoin } from "~/lib/catalog";

interface CoinSearchProps {
  /** Symbols currently tracked (to show added/toggle state). */
  tracked: string[];
  /** Toggle whether a coin is tracked on the dashboard. */
  onToggleTrack: (symbol: string) => void;
}

/**
 * Universal coin search. Queries the `/api/search` catalog route (all coins on
 * Coinbase, not just the curated defaults) and lets the user TRACK any result —
 * which adds it to the dashboard with real data + live updates (the route
 * revalidates the loader on change). Debounced; results render in a popover.
 */
export function CoinSearch({ tracked, onToggleTrack }: CoinSearchProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CatalogCoin[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const trackedSet = new Set(tracked);

  // Debounced fetch against the catalog API.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { Accept: "application/json" },
        });
        const body = (await res.json()) as { results?: CatalogCoin[] };
        setResults(body.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative w-full sm:max-w-sm">
      <label htmlFor="coin-search" className="sr-only">
        Search any cryptocurrency to add to your watchlist
      </label>
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 3.4 9.82l3.64 3.64a1 1 0 0 0 1.42-1.42l-3.64-3.64A5.5 5.5 0 0 0 9 3.5ZM5.5 9a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"
          clipRule="evenodd"
        />
      </svg>
      <input
        id="coin-search"
        type="search"
        inputMode="search"
        placeholder="Search any coin to add…"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded-xl border border-line bg-bg-1 py-2.5 pl-10 pr-3 text-sm text-ink-0 outline-none transition placeholder:text-ink-2 focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
      />

      {open && q.trim().length >= 2 ? (
        <div className="panel absolute z-30 mt-2 max-h-80 w-full overflow-y-auto p-1.5">
          {loading && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-2">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-2">No coins found.</p>
          ) : (
            <ul className="flex flex-col">
              {results.map((c) => {
                const isTracked = trackedSet.has(c.symbol);
                return (
                  <li key={c.symbol}>
                    <button
                      type="button"
                      onClick={() => onToggleTrack(c.symbol)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-bg-2"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-ink-0">{c.name}</span>{" "}
                        <span className="text-ink-2">{c.symbol}</span>
                      </span>
                      <span
                        className="shrink-0 text-xs font-semibold"
                        style={{ color: isTracked ? "var(--accent)" : "var(--ink-2)" }}
                      >
                        {isTracked ? "✓ Tracking" : "+ Track"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
