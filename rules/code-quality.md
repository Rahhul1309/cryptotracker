# Code Quality

Conventions every change to this repo must follow. These encode *how* code is
written here so contributions stay consistent and idiomatic. See also
[`framework-integrity.md`](./framework-integrity.md) for Remix/React rules,
[`security.md`](./security.md) for data-handling rules, and
[`verification.md`](./verification.md) for the gate every change must pass.

## Architecture: keep the layers honest

The codebase is deliberately split so logic is testable and UI is swappable.
**Do not blur these boundaries.**

| Layer | Path | May contain | Must NOT contain |
|---|---|---|---|
| Pure logic | `app/lib/` | rate math, filtering, ordering, formatting | React, JSX, DOM, `fetch` (except the I/O boundary files) |
| I/O boundary | `app/lib/coinbase.ts`, `order-storage.ts` | `fetch`, `localStorage` | business logic that belongs in pure files |
| Domain types | `app/types/` | provider-agnostic interfaces | provider-specific wire shapes |
| Components | `app/components/` | presentation, props, local view state | data fetching, business rules |
| Hooks | `app/hooks/` | React state/effects bridging logic ↔ UI | rendering, business rules |
| Route | `app/routes/` | loader (the only fetch), composition | reusable logic (extract to `lib/`) |

**Rule:** if a function has no React and no I/O, it belongs in `app/lib/` with a
unit test — not inline in a component or the route.

## TypeScript

- **Strict mode is non-negotiable.** `tsconfig` enables `strict` and
  `noUncheckedIndexedAccess`. Never weaken these to make code compile.
- **No `any`.** Use `unknown` at boundaries and narrow with type guards (see
  `isRatesResponse` in `coinbase.ts` as the pattern).
- **Explicit return types** on every exported function.
- **Model absence with `null`, not magic values.** A missing rate is `number |
  null`, surfaced in the UI as "—". Never use `0`, `-1`, or `NaN` as a sentinel.
- Prefer `readonly` arrays for inputs that shouldn't be mutated
  (`readonly CurrencyMeta[]`).

## Naming & style

- Files: components `PascalCase.tsx`, hooks `useThing.ts`, logic
  `kebab-or-lower.ts`. Match the existing neighbours.
- Import via the `~/` alias (`~/lib/rates`), never deep relative paths
  (`../../lib/rates`).
- Functions are verbs (`buildRates`, `applyOrder`); data is nouns
  (`snapshot`, `rates`).
- Keep functions small and single-purpose; a pure function should fit on a
  screen. If it branches on I/O *and* computes, split it.

## Purity & immutability

- Pure functions must not mutate their arguments. Return new arrays/objects
  (`[...items]`, spread). `reorder`/`applyOrder`/`filterCryptos` are the
  reference examples and are explicitly tested for non-mutation.
- Side effects (storage, timers, network) live in hooks or the I/O boundary,
  never in render or in `lib/` math.

## Comments

- Comment the **why**, not the **what**. Explain non-obvious decisions (e.g.
  "best-effort: a failed candle fetch degrades one card, not the page").
- Every `app/lib/` file opens with a short docblock stating its responsibility
  and its testability/I/O status. Preserve that convention.

## Styling

- Use the **semantic CSS-variable tokens** (`bg-bg-1`, `text-ink-1`, `gold`,
  `up`, `down`) from `app/tailwind.css` — never hard-code hex values in
  components. One token set themes both dark and light.
- Movement color: positive → `--up`, negative → `--down`, unknown → `--ink-2`.
- Respect `prefers-reduced-motion` (already handled globally in `tailwind.css`);
  don't add animations that ignore it.
