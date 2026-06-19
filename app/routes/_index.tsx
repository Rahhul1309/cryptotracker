import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useLoaderData,
  useRevalidator,
  useRouteError,
  useSearchParams,
  isRouteErrorResponse,
} from "@remix-run/react";
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";

import { fetchDashboard, RateFetchError } from "~/lib/coinbase";
import { TRACKED_CURRENCIES } from "~/lib/crypto-config";
import { filterCryptos } from "~/lib/filter";
import { buildSnapshot } from "~/lib/rates";
import { mergeLivePrices } from "~/lib/live-merge";
import { applyVisibilityAndPins } from "~/lib/settings";
import type { DashboardData } from "~/types/crypto";

import { CryptoGrid } from "~/components/CryptoGrid";
import { FilterInput } from "~/components/FilterInput";
import { CoinSearch } from "~/components/CoinSearch";
import { RefreshControls } from "~/components/RefreshControls";
import { StatBar } from "~/components/StatBar";
import { ThemeToggle } from "~/components/ThemeToggle";
import { LiveBadge } from "~/components/LiveBadge";
import { TickerTape } from "~/components/TickerTape";
import { CoinDetailModal } from "~/components/CoinDetailModal";
import { Spotlight } from "~/components/Spotlight";
import { SettingsPanel } from "~/components/SettingsPanel";
import { AuroraBackground } from "~/components/AuroraBackground";
import { TerminalFx } from "~/components/TerminalFx";
import { FerrariFx } from "~/components/FerrariFx";
import { Logo } from "~/components/Logo";
import { ErrorState, NoResults, EmptyWatchlist } from "~/components/StateViews";
import { useAutoRefresh } from "~/hooks/useAutoRefresh";
import { useCardOrder } from "~/hooks/useCardOrder";
import { useLivePrices } from "~/hooks/useLivePrices";
import { useSettings } from "~/hooks/useSettings";
import { SettingsProvider } from "~/hooks/settings-context";
import { UserMenu } from "~/components/UserMenu";
import { requireUser } from "~/lib/auth/session.server";
import { getPrefs } from "~/lib/prefs-store.server";
import { fetchCatalog } from "~/lib/catalog-coinbase.server";
import type { CurrencyMeta } from "~/types/crypto";
import { logger } from "~/lib/observability/logger.server";
import { getRequestId } from "~/lib/observability/request-id.server";
import { time } from "~/lib/observability/timing.server";
import { metrics } from "~/lib/observability/metrics.server";

const TRACKED_SYMBOLS = TRACKED_CURRENCIES.map((c) => c.symbol);

const FILTER_PARAM = "q";

export const meta: MetaFunction = () => [
  { title: "CryptoTracker · Live Markets" },
  {
    name: "description",
    content:
      "CryptoTracker — a live cryptocurrency dashboard with watchlist, themes, sparklines, sorting, and filtering.",
  },
  { name: "theme-color", content: "#0a0b0f" },
];

/**
 * Build the full currency list = curated defaults + the user's extra symbols,
 * resolving display names from the Coinbase catalog. Best-effort: if the catalog
 * lookup fails, unknown symbols still appear using the symbol as the name.
 */
async function resolveCurrencies(
  extraSymbols: readonly string[],
): Promise<CurrencyMeta[]> {
  if (extraSymbols.length === 0) return [...TRACKED_CURRENCIES];
  let nameBySymbol = new Map<string, string>();
  try {
    const catalog = await fetchCatalog();
    nameBySymbol = new Map(catalog.map((c) => [c.symbol, c.name]));
  } catch {
    /* catalog unavailable → fall back to symbol-as-name below */
  }
  const extras: CurrencyMeta[] = extraSymbols.map((symbol) => ({
    symbol,
    name: nameBySymbol.get(symbol) ?? symbol,
  }));
  return [...TRACKED_CURRENCIES, ...extras];
}

/**
 * Server loader: requires an authenticated user (redirects to /login if not),
 * then fetches live rates + 24h candles from Coinbase. Throwing the data error
 * drives the route ErrorBoundary; the client never touches the API.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const requestId = getRequestId(request);
  const log = logger.child({ requestId, route: "_index" });
  const user = await requireUser(request);

  try {
    // The tracked set = curated defaults + the coins the user explicitly added
    // via search (`prefs.tracked`), so searched-and-added coins show real data.
    // Names for user-added symbols are resolved from the catalog (best-effort).
    const prefs = await getPrefs(user.id);
    const extraSymbols = Array.from(new Set(prefs.tracked)).filter(
      (s) => !TRACKED_SYMBOLS.includes(s),
    );
    const currencies = await resolveCurrencies(extraSymbols);

    const data = await time(
      "dashboard.fetch",
      () => fetchDashboard(currencies),
      { log, level: "info", fields: { userId: user.id } },
    );
    metrics.incr("dashboard.loader.ok");
    log.info("dashboard loaded", { assets: data.rates.length });
    return json<DashboardData & { user: { email: string } }>({
      ...data,
      user: { email: user.email },
    });
  } catch (err) {
    metrics.incr("dashboard.loader.error");
    log.error("dashboard load failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export default function Dashboard() {
  const { rates, snapshot, fetchedAt, user } = useLoaderData<typeof loader>();

  // User personalization (accent, density, layout, toggles, coins…).
  const { settings, update, reset, toggleIn, flushPrefs } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filter lives in the URL (?q=) so it is shareable and refresh-safe.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get(FILTER_PARAM) ?? "";
  const setQuery = (value: string) => {
    setSearchParams(
      (prev) => {
        if (value) prev.set(FILTER_PARAM, value);
        else prev.delete(FILTER_PARAM);
        return prev;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  // Live mode subscribes to EVERY coin currently loaded (curated defaults +
  // the user's added coins), not just the static defaults — so added coins keep
  // ticking when live is on. Derived from loader `rates` so it always matches
  // what's on screen.
  const allSymbols = useMemo(() => rates.map((r) => r.symbol), [rates]);
  const { prices: livePrices, status: rawStatus } = useLivePrices(
    settings.liveEnabled ? allSymbols : [],
  );
  const liveStatus = settings.liveEnabled ? rawStatus : "offline";

  // When the user's tracked set changes (add/remove via search), re-run the
  // loader so the new coins get real data immediately — no manual refresh.
  // We FLUSH prefs to the server first, then revalidate, so the loader (which
  // reads tracked coins from server prefs) sees the new set — not a stale one.
  const revalidator = useRevalidator();
  const trackedKey = settings.tracked.join(",");
  const hydratedRef = useRef(false);
  useEffect(() => {
    // Skip the very first run (initial mount already has fresh loader data).
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    let cancelled = false;
    void flushPrefs().then(() => {
      if (!cancelled) revalidator.revalidate();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedKey]);

  // When live is OFF we must NOT overlay the (now-stale) last-seen WS prices —
  // we show pure loader data, which interval polling keeps fresh. When live is
  // ON, overlay the streaming prices on top of loader history.
  const liveRates = useMemo(
    () => (settings.liveEnabled ? mergeLivePrices(rates, livePrices) : rates),
    [settings.liveEnabled, rates, livePrices],
  );

  // Mean absolute 24h change across tracked coins — drives the Ferrari engine
  // rev pitch (hotter/more volatile market → higher rev).
  const momentum = useMemo(() => {
    const changes = rates
      .map((r) => r.change24h)
      .filter((c): c is number => c !== null);
    if (changes.length === 0) return 0;
    return (
      changes.reduce((sum, c) => sum + Math.abs(c), 0) / changes.length
    );
  }, [rates]);

  // All vs Watchlist view.
  const [view, setView] = useState<"all" | "watchlist">("all");

  // Remove a coin from the dashboard — works for EVERY coin:
  //  - user-added (in `tracked`)  → drop from tracked (loader stops fetching it)
  //  - curated default            → add to `hidden` (kept in config, just hidden)
  // Either way, also drop it from the watchlist so it doesn't linger there.
  const removeCoin = (symbol: string) => {
    if (settings.tracked.includes(symbol)) {
      update({ tracked: settings.tracked.filter((s) => s !== symbol) });
    } else if (!settings.hidden.includes(symbol)) {
      update({ hidden: [...settings.hidden, symbol] });
    }
    if (settings.watchlist.includes(symbol)) {
      update({ watchlist: settings.watchlist.filter((s) => s !== symbol) });
    }
  };

  // Order (drag, persisted), then pins/hide preferences, then view, then filter.
  const { ordered, moveBySymbol } = useCardOrder(liveRates);
  const arranged = useMemo(
    () => applyVisibilityAndPins(ordered, settings.hidden, settings.pinned),
    [ordered, settings.hidden, settings.pinned],
  );
  const inView = useMemo(() => {
    if (view === "all") return arranged;
    const w = new Set(settings.watchlist);
    return arranged.filter((c) => w.has(c.symbol));
  }, [arranged, view, settings.watchlist]);
  const filtered = useMemo(
    () => filterCryptos(inView, query),
    [inView, query],
  );
  const isFiltering = query.trim() !== "";

  // Snapshot reflects the user's current (visible) set.
  const liveSnapshot = useMemo(() => buildSnapshot(arranged), [arranged]);

  // Polling is a FALLBACK: auto-revalidate the loader whenever the live feed is
  // not actively connected (off, connecting, or reconnecting).
  const pollWhenNotLive = liveStatus !== "live";
  const autoRefresh = useAutoRefresh(
    settings.refreshSeconds * 1000,
    pollWhenNotLive,
  );

  // Detail modal: track the selected symbol; resolve the live row so the modal
  // price keeps ticking. Selecting by symbol (not the object) keeps it live.
  const [selected, setSelected] = useState<string | null>(null);
  const selectedCrypto = useMemo(
    () => liveRates.find((r) => r.symbol === selected) ?? null,
    [liveRates, selected],
  );

  return (
    <SettingsProvider value={settings}>
      {settings.showAurora ? <AuroraBackground /> : null}
      {settings.theme === "terminal" ? <TerminalFx /> : null}
      {settings.theme === "ferrari" ? (
        <FerrariFx liveEnabled={settings.liveEnabled} momentum={momentum} />
      ) : null}
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <header className="mb-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <LiveBadge status={liveStatus} />
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg-1 px-3.5 py-2 text-sm font-medium text-ink-1 transition hover:border-gold/50 hover:text-gold-soft"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v2H3v-2Zm0 4h14v7A1.5 1.5 0 0 1 15.5 17h-11A1.5 1.5 0 0 1 3 15.5v-7Zm4 2a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H7Z" />
              </svg>
              Portfolio
            </Link>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg-1 px-3.5 py-2 text-sm font-medium text-ink-1 transition hover:border-gold/50 hover:text-gold-soft"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M8.3 2.4a1 1 0 0 1 .98-.8h1.44a1 1 0 0 1 .98.8l.22 1.1a6.2 6.2 0 0 1 1.27.73l1.06-.37a1 1 0 0 1 1.2.45l.72 1.24a1 1 0 0 1-.22 1.27l-.84.72c.05.24.08.49.08.73s-.03.49-.08.73l.84.72a1 1 0 0 1 .22 1.27l-.72 1.24a1 1 0 0 1-1.2.45l-1.06-.37a6.2 6.2 0 0 1-1.27.73l-.22 1.1a1 1 0 0 1-.98.8H9.28a1 1 0 0 1-.98-.8l-.22-1.1a6.2 6.2 0 0 1-1.27-.73l-1.06.37a1 1 0 0 1-1.2-.45l-.72-1.24a1 1 0 0 1 .22-1.27l.84-.72a4.5 4.5 0 0 1 0-1.46l-.84-.72a1 1 0 0 1-.22-1.27l.72-1.24a1 1 0 0 1 1.2-.45l1.06.37a6.2 6.2 0 0 1 1.27-.73l.22-1.1ZM10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              </svg>
              Preferences
            </button>
            <ThemeToggle
              mode={settings.mode}
              onToggle={() =>
                update({ mode: settings.mode === "dark" ? "light" : "dark" })
              }
            />
            <UserMenu email={user.email} />
          </div>
        </div>

        {settings.showTicker ? <TickerTape rates={arranged} /> : null}

        <StatBar snapshot={isFiltering ? snapshot : liveSnapshot} />

        {/* Larger spotlight of the day's best & worst movers. Hidden while
            filtering/searching to keep the focus on results. */}
        {!isFiltering && view === "all" ? (
          <Spotlight rates={arranged} onOpen={setSelected} />
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex gap-1 rounded-xl border border-line bg-bg-1 p-1">
              {(["all", "watchlist"] as const).map((v) => {
                const active = view === v;
                const isWatch = v === "watchlist";
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                      active
                        ? "shadow-sm"
                        : "text-ink-1 hover:bg-bg-2 hover:text-ink-0"
                    }`}
                    style={
                      active
                        ? { background: "var(--accent)", color: "var(--bg-0)" }
                        : undefined
                    }
                  >
                    {isWatch ? (
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.96l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76z" />
                      </svg>
                    ) : null}
                    {isWatch ? "Watchlist" : "All"}
                    {isWatch && settings.watchlist.length > 0 ? (
                      <span
                        className="ml-0.5 rounded-full px-1.5 text-[11px] font-bold tabular-nums"
                        style={{
                          background: active
                            ? "color-mix(in srgb, var(--bg-0) 25%, transparent)"
                            : "var(--bg-2)",
                        }}
                      >
                        {settings.watchlist.length}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <FilterInput
              value={query}
              onChange={setQuery}
              resultCount={filtered.length}
            />
          </div>
          <RefreshControls
            fetchedAt={fetchedAt}
            isRefreshing={autoRefresh.isRefreshing}
            liveEnabled={settings.liveEnabled}
            onRefreshNow={autoRefresh.refreshNow}
            onToggleLive={() => update({ liveEnabled: !settings.liveEnabled })}
          />
        </div>

        {/* Universal search: find ANY coin on Coinbase and TRACK it (adds to
            the dashboard with real data + live updates). Distinct from the
            per-card ★ which marks a tracked coin as a watchlist favorite. */}
        <CoinSearch
          tracked={settings.tracked}
          onToggleTrack={(s) => toggleIn("tracked", s)}
        />
      </header>

      <div
        className="transition-opacity duration-300"
        style={{ opacity: autoRefresh.isRefreshing ? 0.6 : 1 }}
        aria-busy={autoRefresh.isRefreshing}
      >
      {view === "watchlist" && settings.watchlist.length === 0 ? (
        <EmptyWatchlist />
      ) : isFiltering && filtered.length === 0 ? (
        <NoResults query={query} />
      ) : (
        <CryptoGrid
          cryptos={filtered}
          onReorder={moveBySymbol}
          onOpen={setSelected}
          onToggleWatch={(s) => toggleIn("watchlist", s)}
          onUntrack={removeCoin}
          dragDisabled={isFiltering}
        />
      )}
      </div>

      <footer className="mt-12 border-t border-line pt-6 text-center text-xs text-ink-2">
        Rates &amp; 24h candles from the public Coinbase API · for demonstration
        only, not financial advice.
      </footer>

      <CoinDetailModal
        crypto={selectedCrypto}
        onClose={() => setSelected(null)}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        update={update}
        toggleIn={toggleIn}
        reset={reset}
      />
      </main>
    </SettingsProvider>
  );
}

/**
 * Route-level error boundary. Renders the friendly error state with a retry
 * that re-runs the loader by reloading the route.
 */
export function ErrorBoundary() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof RateFetchError
      ? error.message
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

  // Reload re-invokes the loader; simplest reliable retry from an error boundary.
  const [reloading, setReloading] = useState(false);
  useEffect(() => {
    if (reloading) window.location.reload();
  }, [reloading]);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <header className="mb-8 flex items-center justify-between">
        <Logo size={44} />
      </header>
      <ErrorState message={message} onRetry={() => setReloading(true)} />
    </main>
  );
}
