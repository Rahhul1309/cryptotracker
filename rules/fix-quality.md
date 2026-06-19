# Fix Quality

How to make changes — fixing bugs and adding features — without eroding the
codebase. Pairs with [`code-quality.md`](./code-quality.md) (the standards) and
[`verification.md`](./verification.md) (the gate).

## Fix the root cause, not the symptom

- Trace a bug to its origin before editing. A wrong number on a card is almost
  always a `lib/` math bug or a bad API assumption — fix it there, where it's
  testable, not by patching the JSX.
- If you find yourself special-casing a value in a component, stop: the data
  layer is probably returning the wrong shape. Fix the source.
- Don't paper over a thrown error with a `try/catch` that swallows it. The
  loader is *meant* to throw so the `ErrorBoundary` can show the retry UI.

## Smallest correct change

- Change only what the task requires. Don't reformat untouched files, rename
  unrelated symbols, or "drive-by refactor" — it buries the real change in diff
  noise and risks regressions.
- Match the surrounding style (naming, comment density, token usage) rather than
  importing your own conventions.
- Reuse existing helpers before writing new ones. Need a price string? Use
  `format.ts`. Need to reorder? Use `reorder`/`applyOrder`. Don't reinvent.

## When you add logic, add a test

- Any new or changed function in `app/lib/` gets a unit test in `app/tests/`
  **in the same change**. This is not optional — it's the gate in
  `verification.md`.
- Test the real edge cases this domain has: `null` rates, empty/one-element
  series, coins missing from the API, duplicate or stale symbols in saved order.
  These have bitten before and are already covered — keep them green.

## Preserve invariants

These behaviours are load-bearing. Don't break them while fixing something else:

- **Symbol is identity.** React keys, dnd ids, and the persisted order are all
  keyed by `symbol`. Never key off array index.
- **Order persists across refresh** and tolerates coins being added (appended)
  or removed (ignored). `applyOrder` guarantees this — keep its contract.
- **Missing data degrades gracefully** — a card with no rate shows "—"; a card
  with no candles drops only its sparkline. Never let one missing field blank a
  card or fail the page.
- **No theme flash.** The pre-paint inline script in `root.tsx` sets the theme;
  don't move theme init into a normal effect.
- **Drag is disabled while filtering** (a filtered subset can't map onto the
  full-list order). Keep that guard if you touch filtering or DnD.

## Don't expand scope silently

- If a fix reveals a deeper problem, note it (or open a follow-up) rather than
  ballooning the current change.
- If a "fix" requires weakening a type, disabling a lint/strict flag, or adding
  `// @ts-ignore`, it's the wrong fix. Find another way.

## Leave it verifiable

Every fix must end green on `npm run typecheck && npm test && npm run build`.
A change that doesn't pass the gate isn't done — see
[`verification.md`](./verification.md).
