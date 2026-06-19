import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "~/lib/auth/password.server";
import { normalizeEmail } from "~/lib/auth/validate";

/**
 * Minimal file-backed user store (JSON on disk). Dependency-free and adequate
 * for a take-home / demo. For production this would be a real database — the
 * interface (`createUser`/`verifyUser`/`getUserById`) is what callers depend
 * on, so swapping the backing store is isolated to this file.
 *
 * Storage path can be overridden with AUTH_DB_PATH (e.g. for tests).
 */

export interface User {
  id: string;
  email: string;
}

interface StoredUser extends User {
  passwordHash: string;
}

interface Db {
  users: StoredUser[];
}

const DB_PATH = process.env.AUTH_DB_PATH ?? join(process.cwd(), ".data/users.json");

async function readDb(): Promise<Db> {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Db;
    if (parsed && Array.isArray(parsed.users)) return parsed;
    return { users: [] };
  } catch {
    return { users: [] };
  }
}

async function writeDb(db: Db): Promise<void> {
  await mkdir(dirname(DB_PATH), { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

const publicUser = (u: StoredUser): User => ({ id: u.id, email: u.email });

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const db = await readDb();
  const norm = normalizeEmail(email);
  return db.users.find((u) => u.email === norm) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await readDb();
  const u = db.users.find((x) => x.id === id);
  return u ? publicUser(u) : null;
}

export type CreateResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export async function createUser(
  email: string,
  password: string,
): Promise<CreateResult> {
  const db = await readDb();
  const norm = normalizeEmail(email);
  if (db.users.some((u) => u.email === norm)) {
    return { ok: false, error: "An account with this email already exists." };
  }
  const user: StoredUser = {
    id: randomUUID(),
    email: norm,
    passwordHash: await hashPassword(password),
  };
  db.users.push(user);
  await writeDb(db);
  return { ok: true, user: publicUser(user) };
}

export async function verifyUser(
  email: string,
  password: string,
): Promise<User | null> {
  const stored = await getUserByEmail(email);
  if (!stored) {
    // Hash anyway to reduce timing oracle on whether the email exists.
    await verifyPassword(password, "scrypt$00$00");
    return null;
  }
  const ok = await verifyPassword(password, stored.passwordHash);
  return ok ? publicUser(stored) : null;
}
