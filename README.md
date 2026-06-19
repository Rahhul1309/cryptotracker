# CryptoTracker — Live Crypto Dashboard

A production-grade cryptocurrency trading dashboard built with **Remix + React +
TypeScript**. Live Coinbase rates render in a responsive card grid with **24h
sparklines**, **change %**, and a **live market stat bar** — all filterable,
drag-and-drop reorderable, and themable (dark/light).

![Stack](https://img.shields.io/badge/Remix-v2-blue) ![TS](https://img.shields.io/badge/TypeScript-strict-blue)

## Design

"**Midnight Terminal**" — a luxe fintech aesthetic: a near-black canvas with a
layered gradient-mesh + grain atmosphere, a warm **gold** accent, and
**emerald/rose** for price movement. Type is **Clash Display** (headlines) +
**Satoshi** (UI) + **JetBrains Mono** (tabular figures). Signature touches:
dependency-free SVG sparklines, **price-flash** tinting on every refresh,
staggered card-reveal on load, and a glassy panel system. The whole theme is
driven by CSS variables, so dark/light is a single token swap.

---

## Features

| Requirement | Status | Notes |
|---|---|---|
| Card layout (≥10 coins) | ✅ | 12 coins, responsive 1→4 column grid |
| Name + symbol per card | ✅ | |
| USD exchange rate | ✅ | Adaptive precision ($68,000 and $0.0000012 both read well) |
| BTC exchange rate | ✅ | Derived from the same single exchange-rate call |
| 24h sparkline + change % | ➕ | Real hourly candles, fetched in parallel, best-effort |
| Live market stat bar | ➕ | Avg 24h, top gainer/loser, asset count |
| Dynamic data fetch | ✅ | Server-side loader, fetched on load |
| Manual + auto refresh | ✅ | Auto-refresh toggle (30s), pauses on hidden tab |
| Drag & drop reorder | ✅ | [@dnd-kit](https://dndkit.com) — pointer **and** keyboard accessible |
| Filter by name/symbol | ✅ | Case-insensitive, synced to URL (`?q=`) |
| **Bonus:** order → localStorage | ✅ | Survives reload; keyed by symbol |
| **Bonus:** dark/light toggle | ✅ | SSR-safe, no flash of wrong theme |
| **Bonus:** loading/error states | ✅ | Skeleton, error boundary w/ retry, empty state |
| Real-time prices (WebSocket) | ➕ | Live Coinbase ticker feed, no backend; polling fallback |
| Motion UI (spring layout, modal) | ➕ | Motion lib: spring reorder/filter, animated detail modal |
| Rolling-digit prices | ➕ | Odometer digits roll on each live tick |
| Live ticker tape | ➕ | Seamless scrolling marquee of all coins |
| Interactive detail modal | ➕ | Click a card → live chart with hover-to-inspect history |
| Card tilt · price glow | ➕ | 3D tilt-on-hover, glow follows tick direction, green/red/flat price |
| Personalization panel | ➕ | Theme + accent, density, grid/list, toggles, precision, live switch, pin/hide coins — all persisted |
| Themes | ➕ | 7 full themes (midnight, gold, silver, cartoon, mario, sports, casual) — palette + background + cards |
| Watchlist + universal search | ➕ | Search ANY Coinbase coin & add it (shows real data); per-user watchlist, All/Watchlist view |
| Portfolio simulation | ➕ | Record simulated buys, see live P/L vs current price on `/portfolio` |
| Per-user preferences | ➕ | Theme/accent/watchlist/order persist server-side per account — follow you across devices |
| Top-movers spotlight | ➕ | Larger gainer/loser cards with bigger charts |
| **Bonus:** user authentication | ✅ | Cookie-session auth, scrypt-hashed passwords (no deps), protected dashboard |
| **Bonus:** unit tests | ✅ | 106 tests over the pure logic layer (Vitest) |
| E2E tests | ➕ | Playwright specs (auth, watchlist, themes, modal) — run against mock data, no live calls |
| Observability | ➕ | Structured JSON logger, request ids, loader/action timing, in-memory metrics |

---

## Setup

**Requirements:** Node.js ≥ 20.

```bash
npm install        # installs from the public npm registry (see note below)
npm run dev        # start dev server → http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit (strict)
npm test           # run unit tests once (Vitest)
npm run test:watch # watch mode
npm run test:e2e   # Playwright E2E (builds + serves in mock mode, no live calls)
npm run heal       # gate + dependency/security report (no changes)
```

> **Registry note:** this project ships a local `.npmrc` pinning installs to
> `https://registry.npmjs.org/`. It was developed on a machine whose global npm
> pointed at a private registry; the local file keeps `npm install` portable
> without touching your global config. Delete it if you don't need it.

### Auth & env
- Set **`AUTH_SECRET`** to a strong random string in any real deployment (used to
  sign the session cookie). A dev fallback is used otherwise.
- No Coinbase API key is needed — the public endpoints are unauthenticated.

## Testing

### Unit tests (Vitest)
Pure logic (`app/lib/`) is covered by fast, deterministic unit tests:

```bash
npm test            # run once
npm run test:watch  # watch mode
```

### End-to-end tests (Playwright)
E2E specs in `e2e/` cover the real user flows — auth (signup / login / logout /
redirect), search-and-track, watchlist, remove-coin, the detail modal, theme +
dark/light persistence, and the live toggle.

**First-time setup** — install the browser binary once:

```bash
npx playwright install chromium
```

**Run the suite:**

```bash
npm run test:e2e            # headless, all specs
npm run test:e2e -- --ui    # interactive UI mode (great for debugging)
npx playwright test -g "watchlist"   # run specs matching a name
npx playwright show-report  # open the HTML report after a run
```

`npm run test:e2e` builds the app and serves it itself (see the `webServer`
block in `playwright.config.ts`) — you don't need a dev server running.

### Why the tests never call Coinbase
Playwright runs the app with **`E2E_MOCK=1`**, which makes the loader serve
deterministic fixtures (`app/lib/coinbase-mock.ts`), the catalog/search serve a
fixed list, and the live WebSocket stay off (the root loader sets
`window.__E2E__`). The result: **zero external calls**, so the suite is fast,
deterministic, and safe for CI and locked-down machines. `E2E_MOCK` is set
*only* by `playwright.config.ts`; a normal `npm run dev`/`start` never sets it
and always uses live data. The test server also runs with a non-`secure` session
cookie so auth works over `http://localhost`.

### Observability
Server logs are structured JSON (`app/lib/observability/`). Control verbosity
with **`LOG_LEVEL`** (`debug|info|warn|error`) and pretty local output with
**`LOG_PRETTY=1`**. Loaders/actions attach a request id, time the Coinbase fetch,
and increment counters; see `app/lib/observability/README.md`.

---

## How it works

### Data flow — prices in one call, trends in parallel
Coinbase's `GET /v2/exchange-rates?currency=USD` returns a single map of
"units per 1 USD" for every currency. Both required price columns are derived
from that **one** response with pure functions (`app/lib/rates.ts`):

```
USD price of X = 1 / rates[X]
BTC price of X = rates[BTC] / rates[X]
```

The 24h **sparkline + change %** come from Coinbase Exchange candle data
(`/products/{X}-USD/candles`), fetched **in parallel** alongside the rate table
and treated as **best-effort**: if a coin's candles fail, that card simply
renders without a sparkline rather than failing the page. The required data is
still a single call; the trend data is an enhancement that degrades gracefully.

### Real-time: hybrid loader + WebSocket
Initial render and sparkline history come from the server `loader` (good SSR,
one REST call). **Live prices stream over a client-side WebSocket directly to
Coinbase's public feed** (`wss://ws-feed.exchange.coinbase.com`, `ticker`
channel) — no custom backend, because the feed is public and unauthenticated. A
backend proxy would only earn its keep for hiding a key or multi-client fan-out,
neither of which applies here.

- `useLivePrices` opens the socket (browser-only, SSR-safe), with
  exponential-backoff reconnect and tab-visibility pause.
- `mergeLivePrices` (pure) overlays live USD prices onto loader rows, recomputing
  BTC price and 24h change from each tick's `open_24h`. Sparklines keep using
  loader candle history. The `LiveBadge` shows feed status.
- **Polling is the fallback:** `useAutoRefresh` auto-revalidates the loader *only
  when the WebSocket isn't live*. When live, polling stays idle. Manual refresh
  and the auto toggle still re-run the loader (refreshing candle history).
- Errors thrown in the loader drive a route `ErrorBoundary` with retry.

### Rate-limit safety (fixes "refresh fails when clicked fast")
Each loader run does 1 rate-table call + N candle calls. To avoid tripping
Coinbase's ~10 req/s/IP limit on rapid refreshes: candle results are held in a
short-TTL cache (`lib/ttl-cache.ts`) so bursts reuse them, and the required
rate-table call retries once on a `429` before surfacing an error.

### State ownership
| State | Where | Why |
|---|---|---|
| Initial rates + candles | Remix loader | Server-fetched (SSR), revalidated on refresh; cached to dodge rate limits |
| Live price ticks | `useLivePrices` (WebSocket) | Sub-second updates, merged over loader data; polling fallback when down |
| Filter text | URL `?q=` | Shareable, survives reload, no extra state lib |
| Card order | `useCardOrder` + localStorage | Persists across reloads; keyed by **symbol** so it survives coins being added/removed |
| Theme | `useTheme` + localStorage | Blocking inline script applies it pre-paint (no flash) |
| Personalization | `useSettings` + localStorage | Accent/density/layout/toggles/coins; accent applied via CSS vars; read by leaf components through `SettingsProvider` |

### Accessibility
Drag-and-drop works with both pointer and keyboard (dnd-kit sensors). The drag
handle is a labeled button; filter results are announced via an `aria-live`
region. Dragging is intentionally disabled while a filter is active, because a
filtered subset doesn't map cleanly onto the persisted full-list order.

---

## Project structure

```
app/
  root.tsx               # HTML shell, Tailwind, pre-paint theme bootstrap
  routes/_index.tsx      # loader (Coinbase fetch) + dashboard + ErrorBoundary
  tailwind.css           # design system: fonts, CSS-var palette, animations
  components/             # presentational + dnd wrappers (no data logic)
    CryptoCard · SortableCryptoCard · CryptoGrid · LiveBadge · TickerTape
    Sparkline · InteractiveChart · CoinDetailModal · RollingNumber
    StatBar · FilterInput · RefreshControls · ThemeToggle · StateViews
  hooks/                  # useCardOrder, useAutoRefresh, useTheme, usePriceFlash,
                          #   useLivePrices, useTilt
  lib/                    # PURE logic: rates/snapshot, filter, ordering, format,
                          #   live-merge, ttl-cache, coinbase (REST) + coinbase-ws (WS wire)
  types/crypto.ts         # provider-agnostic domain types
  tests/                  # Vitest unit tests for the lib/ layer
```

The guiding principle: **all business logic lives in `app/lib/` as pure,
side-effect-free functions** (rate math, filtering, reorder). Components are
presentational; hooks bridge pure logic to React. This is what makes the logic
unit-testable and the codebase easy to extend — see
[`CLAUDE.md`](./CLAUDE.md) for step-by-step recipes (adding a coin, adding a sort
control, swapping the data provider).

---

## Decisions & tradeoffs

- **Remix v2, not React Router 7.** The exercise specifies Remix. `create-remix`
  now only redirects to React Router, so the project was scaffolded manually
  against the stable Remix v2 Vite template.
- **@dnd-kit over react-beautiful-dnd.** The latter is unmaintained; dnd-kit is
  typed, accessible, and the current idiomatic choice.
- **Filter in the URL, order in localStorage.** Filter is ephemeral/shareable so
  it belongs in the URL; order is a durable user preference so it's persisted.
  Neither needs a global state library.
- **Coins absent from the API still render** (with "—") rather than disappearing,
  so a provider gap degrades gracefully.
- **Auto-refresh is opt-in** and pauses on hidden tabs to avoid pointless calls.
- **Theming via CSS variables**, not Tailwind's `dark:` everywhere. One token set
  re-themes the whole app and keeps card/stat styling declarative.
- **Sparklines + the interactive chart are hand-rolled SVG** (no charting
  dependency) — lean, fully on-theme, and the hover-crosshair is just pointer math.
- **Motion (framer-motion)** is the one animation dependency, added deliberately
  for spring-based layout and the modal transitions — things CSS can't do
  cleanly. Reduced-motion is honored throughout.
- **Auth is cookie-session, not a JWT/localStorage token.** The signed,
  `httpOnly`, `sameSite=lax` session cookie holds only the user id; the user is
  looked up server-side per request via `requireUser`, which redirects
  unauthenticated visitors to `/login`. Passwords are scrypt-hashed (Node
  built-in — no bcrypt dependency).
- **Two-tier preference storage.** Per-user prefs (theme, mode, accent,
  watchlist, tracked coins, order) live **server-side keyed by userId**
  (`/api/preferences`) so they follow the account across devices; `localStorage`
  is a fast-path cache for instant, flash-free first paint. **Server wins on
  load**, but a guard (`userTouched`) prevents the async server hydrate from
  clobbering an interaction made before it resolves, and a `sendBeacon` flush on
  page-hide ensures a change immediately followed by reload isn't lost to the
  save debounce.
- **"Tracked" and "watchlist" are separate concepts.** Tracking = which coins
  are fetched/priced/streamed (curated defaults + coins added via search);
  watchlist = a favorites *view* over tracked coins. Conflating them caused the
  early "added coin disappears" bugs.
- **Themes are full palettes, not just an accent swap.** Each of the 9 themes
  redefines colours, fonts, card shape, and background via a
  `data-theme` + `data-mode` attribute contract in `tailwind.css`; every theme
  has both a dark and light mode. Two themes (Ferrari, Terminal) add scoped,
  opt-in "magical" effects that only mount in that theme and clean up on switch.
- **Mock data mode (`E2E_MOCK=1`)** lets the whole app run with deterministic
  fixtures and **zero external calls** — used by Playwright and safe for CI /
  locked-down machines. A normal `dev`/`start` never sets it and always uses live
  Coinbase data.
- **File-backed JSON stores** (`.data/*.json`) back users, prefs, and portfolios.
  Dependency-free and fine for a demo; each is isolated behind a store module so
  swapping in a real database touches only that one file.

### If I had more time
- Replace the JSON file stores with SQLite/Postgres (the store modules already
  isolate this).
- Sort controls (by price / 24h change) — the pure `lib/` layer is shaped for it.
- Rate-limit/backoff handling and a stale-while-revalidate cache on the server.
- Broaden E2E coverage (portfolio P&L, per-theme effects) and add visual
  regression snapshots.
