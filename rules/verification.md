# Verification

No change is "done" until it passes verification. This is the gate; treat it as
mandatory, not aspirational.

## The gate — run before every commit/handoff

```bash
npm run typecheck   # tsc, strict — must be clean (zero errors)
npm test            # vitest run — all tests must pass
npm run build       # remix vite:build — must succeed
```

All three must pass. A change that fails any of them is incomplete — do not
report it as finished, and do not commit it.

Quick one-liner:

```bash
npm run typecheck && npm test && npm run build && echo "✅ gate passed"
```

## What each step guards

- **typecheck** — strict types, `noUncheckedIndexedAccess`. Catches null-handling
  gaps and shape drift between `lib/`, types, and components.
- **test** — the pure-logic layer (`app/lib/`): rate math, 24h change, snapshot,
  filtering, ordering. This is where correctness lives, so this is where bugs
  must be caught.
- **build** — SSR + client bundles compile, the loader/route wire up, Tailwind +
  the CSS-variable design system resolve. Catches import/SSR mistakes that
  typecheck alone misses.

## Test discipline

- **New/changed `lib/` logic ships with tests in the same change.** See
  [`fix-quality.md`](./fix-quality.md).
- Cover this domain's real edges: `null` rates, short/empty candle series, coins
  absent from the API, duplicate/stale symbols in saved order, no-op and
  out-of-range reorders. These are already covered — keep them green.
- Tests must be deterministic: no real network, no wall-clock/random dependence.
  Pure functions take their inputs as arguments — exploit that.
- Don't delete or weaken a failing test to go green. A red test is either a real
  regression (fix the code) or an intentional behaviour change (update the test
  *and* say so).

## Manual / behavioural checks (when UI or data flow changes)

Typecheck/test/build don't exercise the browser. When you touch UI, data
fetching, or refresh, also verify by running `npm run dev` and confirming:

- Cards load with USD + BTC rates, sparklines, and 24h change.
- Filter by name and by symbol (e.g. `eth`, `solana`) narrows correctly; URL
  `?q=` updates; clearing restores the full list.
- Drag-reorder works with mouse **and** keyboard; the order survives a reload
  (localStorage) and a manual refresh.
- Manual refresh and the auto-refresh toggle both update data; values flash on
  change; the timestamp updates.
- Dark/light toggle works with **no flash** on reload.
- Error path: the `ErrorBoundary` shows the retry UI when the loader fails (you
  can force this by pointing the client at an unreachable host).

> Note: live data requires outbound network to `api.coinbase.com` and
> `api.exchange.coinbase.com`. In a restricted/offline environment the loader
> will throw and you'll see the error state — that's expected, not a bug.

## Before sharing / committing

- Re-run the gate one final time.
- Keep diffs scoped (see `fix-quality.md`) — no stray formatting churn.
- Update `README.md` / `CLAUDE.md` if behaviour, structure, or commands changed.
