# AI Contributor Guide

Guidance for AI agents (and humans) extending this codebase. Read this before
making changes — it encodes the conventions that keep the project consistent.

## Project rules (auto-loaded)

The `rules/` folder holds the enforceable standards every change must meet.
They are imported below so Claude Code loads them into context automatically
when working anywhere in this repo:

@rules/ai-guardrails.md
@rules/code-quality.md
@rules/fix-quality.md
@rules/framework-integrity.md
@rules/security.md
@rules/verification.md

This file is the mental model + feature recipes; the imported `rules/` are the
hard standards. If guidance here ever conflicts with `rules/ai-guardrails.md`,
the guardrails win.

## Mental model

- **`app/lib/` is pure.** No React, no I/O (except `coinbase.ts` and the
  `loadOrder`/`saveOrder` storage functions, which are explicitly the I/O
  boundary). All business logic — rate math, 24h change, market snapshot,
  filtering, reordering, formatting — lives here as side-effect-free functions
  so it can be unit-tested in isolation.
- **`app/components/` is presentational.** Components receive data and callbacks
  via props. They contain no fetching and no business logic. `CryptoCard` is
  pure UI (it owns only the visual price-flash); `SortableCryptoCard`/
  `CryptoGrid` add the dnd-kit wiring; `Sparkline`/`StatBar` are pure SVG/markup.
- **`app/hooks/` bridges pure logic to React** (state, effects, persistence).
- **Two I/O boundaries only:** the server `loader` in `app/routes/_index.tsx`
  (REST, via `coinbase.ts`) and the client WebSocket in `useLivePrices.ts` (live
  ticks, wire format in `coinbase-ws.ts`). No other component or hook does I/O.
- **`app/types/crypto.ts` is provider-agnostic.** No Coinbase-specific shapes
  leak out of `coinbase.ts` / `coinbase-ws.ts`.

## Conventions

- TypeScript is **strict** with `noUncheckedIndexedAccess`. No `any`. Prefer
  explicit return types on exported functions.
- Import with the `~/` alias (e.g. `~/lib/rates`), not relative paths.
- Styling is **Tailwind** on top of a **CSS-variable design system** in
  `app/tailwind.css`. Use the semantic tokens (`bg-bg-1`, `text-ink-1`, `gold`,
  `up`, `down`) rather than raw Tailwind palette colors — they auto-theme between
  dark/light. Only the `:root` / `html:not(.dark)` blocks define raw colors.
  For movement coloring, positive → `--up`, negative → `--down`.
- A coin's **symbol is its stable identity** (used as React key, dnd id, and the
  localStorage order key). Never key off array index.
- After any change, all of these must pass:
  ```bash
  npm run typecheck && npm test && npm run build
  ```
- Add/extend unit tests in `app/tests/` for any new logic in `app/lib/`.

---

## Recipe: add a new coin

1. Add one entry to `TRACKED_CURRENCIES` in `app/lib/crypto-config.ts`:
   ```ts
   { symbol: "UNI", name: "Uniswap" },
   ```
   `symbol` must match Coinbase's ticker. **Nothing else changes** — the loader
   fetches all rates in one call and the UI picks it up. Coins missing from the
   API render with "—" rather than breaking.

## Recipe: add a sort control (e.g. sort by USD price)

1. Add a pure `sortCryptos(list, key, dir)` to a new `app/lib/sort.ts` and unit
   test it in `app/tests/sort.test.ts`.
2. Store the active sort in the URL (like the filter: `?sort=usd&dir=desc`) so it
   is shareable and refresh-safe.
3. Apply it in `_index.tsx` **after ordering, before filtering**. Note: an active
   sort and manual drag-reorder are mutually exclusive concepts — disable drag
   (`dragDisabled`) while a sort is active, mirroring how filtering does it.

## Recipe: swap the data provider

Two files know wire formats: `app/lib/coinbase.ts` (REST) and
`app/lib/coinbase-ws.ts` (WebSocket). Everything else is provider-agnostic.

REST side:
1. Reimplement `fetchDashboard(currencies, signal?): Promise<DashboardData>`.
2. Reuse `buildRates()`/`buildSnapshot()` from `rates.ts` if the new provider
   returns a per-USD map; otherwise map into `CryptoRate[]` yourself.
3. Throw `RateFetchError` (or any error) on failure so the `ErrorBoundary` works.

Live side (optional — live prices are an enhancement):
4. Reimplement the pure helpers in `coinbase-ws.ts` (`COINBASE_WS_URL`,
   `buildSubscribeMessage`, `parseTicker` → `LiveTick`). `useLivePrices` and
   `mergeLivePrices` stay unchanged.
5. If the new provider has no public WS, drop `useLivePrices` from the route; the
   loader + polling fallback keep working with zero other changes.

No component or type needs to change in either case.

## Recipe: change the refresh interval

Edit `AUTO_REFRESH_MS` in `app/routes/_index.tsx`. The interval is passed to both
the hook and the UI label, so one constant controls both.

## Recipe: add a new card field (e.g. 24h change %)

1. Add the field to `CryptoRate` in `app/types/crypto.ts` (e.g. `change24h: number | null`).
2. Populate it in `buildRates()` (or the provider client) and test the math.
3. Add a formatter to `app/lib/format.ts` (+ test) and render it in `CryptoCard.tsx`.

---

## Gotchas

- **Don't fetch on the client.** Refresh goes through `useRevalidator`, which
  re-runs the loader. This keeps one data path and the API call server-side.
- **localStorage is client-only.** Guard with `typeof window === "undefined"`
  (already done in `order-storage.ts` / `useTheme.ts`) to avoid SSR crashes and
  hydration mismatches.
- **Theme must stay flash-free.** The inline `themeBootstrapScript` in `root.tsx`
  applies the theme before paint; don't move theme initialization into a normal
  effect or you'll reintroduce the flash.
- **Order persists by symbol, not index**, so `applyOrder` tolerates coins being
  added (appended) or removed (ignored). Preserve that behavior.
