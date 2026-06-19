# Framework Integrity

Rules for working *with* Remix and React rather than against them. Violating
these is the most common way this kind of app accrues bugs (hydration
mismatches, duplicated data paths, theme flashes).

## Remix: one data path — the loader

- **All data fetching happens in the route `loader`.** Do not `fetch` from
  components or `useEffect`. The Coinbase call lives server-side in
  `app/routes/_index.tsx`'s loader and nowhere else.
- **Refresh = revalidate.** Manual and auto refresh both call
  `useRevalidator().revalidate()`, which re-runs the loader. Never add a second,
  client-side fetch path — it splits the source of truth and leaks the API to
  the browser.
- **Errors belong to the boundary.** Throw in the loader (e.g. `RateFetchError`)
  and let the route `ErrorBoundary` render the retry UI. Don't catch-and-render
  inline in the component.
- **Loaders run on the server**, so secrets/keys (if ever added) stay server-side
  via `process.env`. Never reference them in component code.
- Type loader data with `useLoaderData<typeof loader>()` — don't hand-write the
  type; let it flow from the loader's return.

## React: state ownership & purity

- **Render is pure.** No fetching, no `localStorage`, no `Date.now()`, no
  mutation during render. Side effects go in `useEffect`; derived values go in
  `useMemo`.
- **Match state to its nature:**
  - ephemeral + shareable (filter) → URL search params (`?q=`)
  - durable user preference (order, theme) → `localStorage` via a hook
  - server data (rates) → loader
  - Don't reach for a global store; this app doesn't need one.
- Keep `useMemo`/`useEffect` dependency arrays honest. If you intentionally run
  an effect only on mount (e.g. hydrating saved order), isolate it and document
  why, as `useCardOrder` does.

## WebSocket / live feed

- The live price WebSocket is the app's **second I/O boundary** and lives ONLY in
  `useLivePrices.ts` (connection) + `coinbase-ws.ts` (pure wire format). Don't
  open sockets anywhere else.
- It must be **browser-only**: create the socket inside `useEffect` and guard
  `typeof window`/`WebSocket`. Never reference `WebSocket` at module top level or
  in render — that breaks SSR.
- Always `close()` on unmount, reconnect with backoff, and pause while the tab is
  hidden. Live data **augments** loader data via `mergeLivePrices`; it must never
  become a hard dependency — if the socket is down, the loader + polling fallback
  must still render a complete UI.

## SSR / hydration: the sharp edges

- **`localStorage` and `window` don't exist on the server.** Guard every access
  with `typeof window === "undefined"` (see `order-storage.ts`, `useTheme.ts`).
  Reading them during render causes hydration mismatches; reading them in SSR
  throws.
- **Server and first client render must produce identical HTML.** Anything that
  depends on client-only state (saved order, theme) must hydrate *after* mount,
  not during the initial render.
- **Theme is applied pre-paint** by the inline `themeBootstrapScript` in
  `root.tsx` to avoid a flash. The `useTheme` hook then reads the already-applied
  class on mount. Don't reorder this dance.

## Drag-and-drop (dnd-kit)

- Sortable item `id` is the coin `symbol` — keep it stable and unique.
- Preserve both sensors (pointer **and** keyboard) — keyboard reordering is an
  accessibility requirement, not a nicety.
- Reordering mutates only the order state (keyed by symbol) and persists it; it
  never touches the loader data.

## Dependencies

- Prefer the platform and what's already here. New runtime deps need a real
  justification — e.g. sparklines are hand-rolled SVG specifically to avoid a
  charting library. Don't add one to draw a line.
- Remix is intentionally **v2** (the exercise specifies Remix). Don't migrate to
  React Router 7 or introduce v3-incompatible patterns.
