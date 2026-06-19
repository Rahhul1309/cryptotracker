# Rules

Contribution rules for this repo — guidelines for both humans and AI agents
making follow-up changes. Read the relevant file before working in that area.

| File | Covers |
|---|---|
| [`code-quality.md`](./code-quality.md) | Architecture boundaries, TypeScript, naming, purity, styling tokens |
| [`fix-quality.md`](./fix-quality.md) | How to fix bugs / add features: root cause, smallest change, invariants |
| [`framework-integrity.md`](./framework-integrity.md) | Working with Remix + React: loader data path, SSR/hydration, dnd-kit |
| [`security.md`](./security.md) | Trust boundaries, secrets, injection, dependency & client-storage hygiene |
| [`verification.md`](./verification.md) | The mandatory typecheck → test → build gate, plus manual UI checks |

For the architectural mental model and step-by-step feature recipes (add a coin,
add a sort control, swap the data provider), see [`../CLAUDE.md`](../CLAUDE.md).

## Tooling

- **Skill** — [`.claude/skills/frontend`](../.claude/skills/frontend/SKILL.md):
  guidance for building UI in the Midnight Terminal design system.
- **Agent** — [`.claude/agents/repo-janitor.md`](../.claude/agents/repo-janitor.md):
  a read-only custodian that audits structural drift, dead code, and dependency
  updates against these rules, and applies only approved, reversible cleanups.
  Invoke it with the Agent tool (`subagent_type: repo-janitor`) or ask Claude to
  "clean up / audit the repo / check for package updates."
