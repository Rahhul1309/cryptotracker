import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DEFAULT_SETTINGS, type Settings } from "~/lib/settings";
import { normalizePrefs } from "~/lib/prefs";

/**
 * Minimal file-backed per-user preferences store (JSON on disk). Mirrors the
 * pattern in `users.server.ts` (readDb/writeDb, mkdir, env-overridable path):
 * dependency-free and adequate for a take-home / demo. For production this would
 * be a real database — callers depend only on `getPrefs`/`savePrefs`, so the
 * backing store is isolated to this file.
 *
 * Preferences are keyed by `userId` so they follow the authenticated account
 * across devices/logins (unlike the client-only localStorage copy). Stored
 * values are always run through `normalizePrefs` (mergeSettings) on read and
 * write, so an attacker-influenceable or stale on-disk value can never become a
 * trusted shape, and adding a setting later stays forward-compatible.
 *
 * Storage path can be overridden with PREFS_DB_PATH (e.g. for tests).
 */

interface Db {
  /** Map of userId → that user's saved (validated) settings. */
  prefs: Record<string, Settings>;
}

const DB_PATH =
  process.env.PREFS_DB_PATH ?? join(process.cwd(), ".data/prefs.json");

async function readDb(): Promise<Db> {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<Db> | null;
    if (parsed && typeof parsed.prefs === "object" && parsed.prefs !== null) {
      return { prefs: parsed.prefs as Record<string, Settings> };
    }
    return { prefs: {} };
  } catch {
    return { prefs: {} };
  }
}

async function writeDb(db: Db): Promise<void> {
  await mkdir(dirname(DB_PATH), { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

/**
 * Return the user's saved Settings, or `DEFAULT_SETTINGS` if they have none.
 * The stored value is always validated through `normalizePrefs` so it is safe
 * and forward-compatible even if the on-disk schema is older or tampered with.
 */
export async function getPrefs(userId: string): Promise<Settings> {
  const db = await readDb();
  const stored = db.prefs[userId];
  if (stored === undefined) return { ...DEFAULT_SETTINGS };
  return normalizePrefs(stored);
}

/**
 * Validate `raw` into safe Settings, persist it under `userId`, and return the
 * saved Settings. Untrusted input is sanitized via `normalizePrefs` before it
 * ever touches disk.
 */
export async function savePrefs(
  userId: string,
  raw: unknown,
): Promise<Settings> {
  const settings = normalizePrefs(raw);
  const db = await readDb();
  db.prefs[userId] = settings;
  await writeDb(db);
  return settings;
}
