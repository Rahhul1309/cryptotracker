---
name: frontend
description: >-
  Build and modify the Aurum crypto dashboard frontend — React components,
  the "Midnight Terminal" design system, Tailwind + CSS-variable theming,
  sparklines/stat-bar/cards, animations, and dark/light theming. Use when
  adding or changing any UI in app/components, app/routes, app/hooks, or
  app/tailwind.css, or when asked to restyle, add a card field, build a new
  panel, or adjust the look and feel.
---

# Aurum Frontend

How to build UI in this repo so it stays cohesive with the existing
"Midnight Terminal" aesthetic and the layered architecture. This skill is
project-specific; for general standards see [`rules/`](../../../rules/) and for
feature recipes see [`CLAUDE.md`](../../../CLAUDE.md).

## Aesthetic direction — commit to it

**Midnight Terminal**: a luxe fintech trading desk. Deep near-black canvas with
a gradient-mesh + grain atmosphere, a warm **gold** accent, **emerald/rose** for
price movement. Calm, dense, precise — not playful, not pastel, not purple-on-
white. Light mode is a warm "parchment desk," never stark white.

When adding UI, ask: *does this look like it belongs on a $1B trading terminal?*
Favor restraint, tabular numbers, hairline borders, and one or two confident
accents over many competing colors.

## The design system lives in CSS variables

`app/tailwind.css` defines the entire palette as CSS variables under `:root`
(dark) and `html:not(.dark)` (light). **Never hard-code hex in components.** Use
the semantic Tailwind tokens wired to those variables in `tailwind.config.ts`:

| Token | Use |
|---|---|
| `bg-bg-0` / `bg-bg-1` / `bg-bg-2` | page / panel / raised surfaces |
| `text-ink-0` / `ink-1` / `ink-2` | primary / secondary / muted text |
| `border-line` | hairline borders |
| `text-gold` / `gold-soft` | the accent (sparingly) |
| `text-up` / `text-down` | positive / negative price movement |

For one-off blends use `color-mix(in srgb, var(--gold) 16%, transparent)` —
that's the established pattern for tints and glows.

**Fonts** (loaded in `tailwind.css`): `font-display` = Clash Display
(headlines), `font-sans` = Satoshi (default UI), `font-mono-num` = JetBrains
Mono with tabular figures — **use it for every number** so columns align.

**Reusable classes:** `.panel` (glassy card surface), `.animate-rise` (staggered
reveal), `.flash-up`/`.flash-down` (price flash), `.shimmer` (skeleton). Reuse
these before inventing new ones.

## Architecture rules (don't break these)

- **Components are presentational.** Props in, JSX out. No `fetch`, no business
  logic. Data comes from the route loader; math comes from `app/lib/`.
- **Pure logic → `app/lib/` with a test.** Formatting a value? Use/extend
  `app/lib/format.ts`. Don't compute in JSX.
- **Coin `symbol` is identity** — React keys, dnd ids, persisted order. Never key
  off index.
- A presentational component should render standalone in a test with a plain
  object — keep dnd-kit/data wiring in the wrapper (`SortableCryptoCard`) or the
  route, as `CryptoCard` does.

## Motion

- High-impact, not scattered: one orchestrated load (staggered `.animate-rise`
  via `animationDelay`) beats many fidgety micro-interactions.
- Price changes flash via `usePriceFlash` → `.flash-up`/`.flash-down`. Reuse the
  hook for any value that updates on refresh.
- **Always respect `prefers-reduced-motion`** — it's handled globally in
  `tailwind.css`; don't add animations that bypass it.

## Accessibility (required, not optional)

- Drag handles are real `<button>`s with `aria-label`; reordering works with
  keyboard sensors — preserve both.
- Use `aria-live` for dynamic status (filter result count), `role="alert"` for
  errors, `role="switch"` + `aria-checked` for toggles. Label every icon button.
- Maintain contrast in **both** themes — check `ink-1`/`ink-2` on `bg-1` light
  and dark when introducing text.

## Recipe: add a new field to the card

1. Add it to `CryptoRate` in `app/types/crypto.ts` as `T | null`.
2. Populate it in `buildRates` (or the provider client) + add a test.
3. Add a formatter to `app/lib/format.ts` (+ test).
4. Render it in `CryptoCard.tsx` using existing tokens (`font-mono-num`,
   `text-ink-1`, `up`/`down` for signed values). Keep the card balanced — don't
   crowd it; consider the existing header / sparkline / footer rows.

## Recipe: add a new panel (e.g. a chart drawer or summary widget)

1. New presentational component in `app/components/`, wrapped in `.panel`,
   `rounded-2xl`, semantic tokens.
2. Feed it data from the loader via props (or a memoized derive in the route);
   no fetching inside.
3. Stagger its entrance with `.animate-rise` if it's part of the initial load.
4. Verify both themes and reduced-motion.

## Before you finish

Run the gate in [`rules/verification.md`](../../../rules/verification.md):
`npm run typecheck && npm test && npm run build`, then eyeball the change in
`npm run dev` in **both** light and dark mode and at mobile + desktop widths.
