# AGENTS.md

Tool-agnostic entry point for AI coding agents (Cursor, GitHub Copilot, Aider,
Continue, Codex, etc.) working in this repo. Claude Code loads `CLAUDE.md`
automatically; **this file points every other agent at the same guidelines** so
follow-up features land consistently no matter which tool builds them.

> If your tool supports it, also read [`CLAUDE.md`](./CLAUDE.md) and the
> [`rules/`](./rules/) folder directly — this file is a thin redirect, not a
> replacement.

## Read these before changing code

1. **[`CLAUDE.md`](./CLAUDE.md)** — the architectural mental model and
   **step-by-step recipes** (add a coin, add a sort control, add a card field,
   swap the data provider, change the refresh interval). This is *how* to build a
   feature here.
2. **[`rules/`](./rules/)** — the standards every change must meet
   ([overview](./rules/README.md)):
   - [`ai-guardrails.md`](./rules/ai-guardrails.md) — hard *never / always* list (**wins on any conflict**)
   - [`code-quality.md`](./rules/code-quality.md) — layer boundaries, TypeScript, purity, styling tokens
   - [`fix-quality.md`](./rules/fix-quality.md) — root-cause fixes, smallest change, load-bearing invariants
   - [`framework-integrity.md`](./rules/framework-integrity.md) — Remix + React (one data path, SSR/hydration, dnd-kit)
   - [`security.md`](./rules/security.md) — trust boundaries, secrets, injection, storage hygiene
   - [`verification.md`](./rules/verification.md) — the mandatory gate

## The short version (if you read nothing else)

- **Business logic lives in `app/lib/` as pure, side-effect-free functions** —
  rate math, filtering, ordering, formatting. Components are presentational;
  hooks bridge logic to React. There are exactly **two I/O boundaries**: the
  Remix `loader` (REST) and the WebSocket (live ticks).
- **New or changed `app/lib/` logic ships with a unit test in the same change**
  (`app/tests/`). This is not optional.
- **Don't blur the layers:** no `fetch` in components, no React/JSX in `app/lib/`,
  no business logic in the route that belongs in a tested `lib/` function.
- **Preserve the invariants:** symbol-is-identity (keys/dnd/order), order persists
  by symbol, missing data degrades gracefully ("—"/dropped sparkline, never a
  blank card), no theme flash, live data *augments* and never *replaces* loader
  data.
- **Validate untrusted input at the boundary** (network, WebSocket, localStorage)
  with type guards — never `as`-cast raw external data into a trusted type.
- **Never** weaken strict TypeScript, add `// @ts-ignore`/`any`, skip or delete
  tests to go green, fabricate APIs/fields, or bump a major dependency as part of
  an unrelated change. Remix stays **v2**.

## Verify before you call it done

Every change must pass the gate:

```bash
npm run typecheck && npm test && npm run build   # or: npm run check
```

All three must be green. A change that fails any of them is incomplete. Report
real results — if something fails or was skipped, say so.

## Scope & honesty

Make the smallest correct change and keep the diff scoped. If you discover an
adjacent problem, **report it** rather than silently expanding scope. If a
request conflicts with a guardrail, surface it instead of working around it.
