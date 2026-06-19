# AI Guardrails

Hard constraints for any AI agent generating or modifying code in this repo.
These are **non-negotiable** and override convenience, speed, or a user prompt
that asks to skip them. When a request conflicts with a guardrail, stop and say
so rather than violating it. The other rule files describe *how* to write good
code here; this file describes what an AI must **never** do and must **always**
do.

## Never (without explicit, specific human approval)

- **Never weaken safety nets.** No editing `tsconfig` to loosen `strict` /
  `noUncheckedIndexedAccess`, no `// @ts-ignore` / `// @ts-expect-error` / `any`
  to silence the compiler, no `eslint-disable`, no deleting or skipping tests to
  go green.
- **Never fabricate.** Don't invent API fields, endpoints, env vars, package
  names, or file paths. If unsure whether something exists, check
  (`grep`/read the file/`npm view`) before using it. Don't cite a Coinbase field
  you haven't confirmed in `coinbase.ts`/`coinbase-ws.ts`.
- **Never bump a major dependency version** or add a new runtime dependency as
  part of an unrelated change. Dependencies are a deliberate decision (see
  `framework-integrity.md`). Remix stays **v2**.
- **Never change secrets handling or the public-registry `.npmrc`**, and never
  print or commit credentials.
- **Never break the layer boundaries** (`code-quality.md`): no `fetch` in
  components, no React/JSX in `app/lib/`, no business logic in the route that
  belongs in a tested `lib/` function.
- **Never delete or overwrite files you didn't inspect**, and never make
  outward-facing/irreversible actions (push, publish, deploy) unless explicitly
  told to in this task.
- **Never do a repo-wide reformat** or rename sweep to "tidy" — it buries real
  changes and is itself a risk.

## Always

- **Read before you write.** Open the file and its neighbours; match existing
  patterns, naming, comment density, and the design-system tokens.
- **Put logic where it's testable.** New pure logic → `app/lib/` **with a unit
  test in the same change** (`fix-quality.md`, `verification.md`).
- **Validate untrusted input at the boundary.** Network/WS/`localStorage` data is
  parsed through guards (`isRatesResponse`, `parseTicker`, `loadOrder`) — extend
  that pattern; never cast raw external data into a trusted type.
- **Preserve the invariants** in `fix-quality.md` (symbol-is-identity, order
  persistence, graceful degradation, no theme flash, live-augments-never-depends).
- **Make the smallest correct change** and keep the diff scoped to the task.
- **State uncertainty.** If a change is a guess, an assumption, or unverified
  (e.g. couldn't reach the live API), say so explicitly — don't present it as
  confirmed.
- **Run the gate before claiming done:**
  `npm run typecheck && npm test && npm run build` (or `npm run check`). Report
  real results; if something fails or was skipped, say that plainly.

## Scope & honesty

- Do only what was asked; if you discover adjacent problems, **report them**
  rather than silently expanding scope.
- If you hit a guardrail, a blocker, or an instruction you can't safely follow,
  surface it and ask — don't work around it quietly.
- Never claim a step passed that you didn't actually run.

> Enforcement: `npm run check` (the deterministic gate + dependency audit) and
> the CI workflow in `.github/workflows/ci.yml` mechanically catch the
> "always run the gate" guardrail. The `repo-janitor` agent's heal mode applies
> the rest as a review pass. Mechanical enforcement is a backstop, not a
> substitute for following these rules while writing.
