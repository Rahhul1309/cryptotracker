#!/usr/bin/env node
/**
 * Self-healing health check — SUGGEST-ONLY.
 *
 * Runs the verification gate (typecheck → test → build) plus a dependency audit
 * (`npm outdated`, `npm audit`) and prints a prioritized report. It makes **no
 * changes** to the repo: it diagnoses and recommends, leaving fixes to a human
 * or the `repo-janitor` agent. Exit code is non-zero if the gate fails so it can
 * gate CI.
 *
 * Usage: `npm run heal`  (or `node scripts/heal.mjs`)
 */
import { execSync } from "node:child_process";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

/** Run a command; capture output and success without throwing. */
function run(cmd) {
  try {
    const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function header(text) {
  console.log(`\n${BOLD}${text}${RESET}`);
}

const results = { gate: [], suggestions: [] };

// ---- 1. Verification gate -------------------------------------------------
header("🩺 Verification gate");
for (const [label, cmd] of [
  ["typecheck", "npm run typecheck"],
  ["tests", "npm test"],
  ["build", "npm run build"],
]) {
  process.stdout.write(`${DIM}· ${label}…${RESET} `);
  const r = run(cmd);
  results.gate.push({ label, ok: r.ok });
  console.log(r.ok ? `${GREEN}pass${RESET}` : `${RED}FAIL${RESET}`);
  if (!r.ok) {
    // Show a trimmed tail so failures are actionable without flooding output.
    console.log(DIM + r.out.split("\n").slice(-12).join("\n") + RESET);
  }
}

// ---- 2. Dependency audit (suggest-only) -----------------------------------
header("📦 Dependency report (suggestions only — no changes made)");

const outdated = run("npm outdated --json");
let pkgs = {};
try {
  pkgs = JSON.parse(outdated.out || "{}");
} catch {
  pkgs = {};
}
const entries = Object.entries(pkgs);
if (entries.length === 0) {
  console.log(`${GREEN}All dependencies within their declared ranges.${RESET}`);
} else {
  for (const [name, info] of entries) {
    const { current, wanted, latest } = info;
    const major = (v) => Number(String(v).split(".")[0]);
    const isMajor = major(latest) > major(current ?? wanted);
    // Pinned framework guard: Remix is intentionally v2.
    const remixHold = name.startsWith("@remix-run/") && major(latest) > 2;
    const tag = remixHold
      ? `${YELLOW}HOLD (Remix stays v2)${RESET}`
      : isMajor
        ? `${YELLOW}MAJOR — review migration${RESET}`
        : `${GREEN}patch/minor — safe to review${RESET}`;
    console.log(`  ${name}: ${current} → ${latest}  ${tag}`);
  }
  console.log(
    `${DIM}  (Apply with care; never auto-bump majors. See rules/ai-guardrails.md.)${RESET}`,
  );
}

const audit = run("npm audit --omit=dev");
header("🔒 Security audit (prod deps)");
const auditTail = audit.out.split("\n").filter(Boolean).slice(-6).join("\n");
console.log(DIM + (auditTail || "no output") + RESET);

// ---- 3. Verdict -----------------------------------------------------------
const gateOk = results.gate.every((g) => g.ok);
header(gateOk ? `${GREEN}✅ Gate green${RESET}` : `${RED}❌ Gate failing${RESET}`);
if (!gateOk) {
  console.log(
    "Heal is suggest-only: fix the failing step above, or run the `repo-janitor` agent.",
  );
  process.exit(1);
}
