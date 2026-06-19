import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Holding } from "~/lib/portfolio";

/**
 * Minimal file-backed store for simulated portfolio holdings (JSON on disk),
 * keyed by userId. Dependency-free and adequate for a demo — mirrors the
 * pattern in `auth/users.server.ts`. For production this would be a real
 * database; the interface (`getHoldings`/`addHolding`/`removeHolding`) is what
 * callers depend on, so swapping the backing store is isolated to this file.
 *
 * Storage path can be overridden with PORTFOLIO_DB_PATH (e.g. for tests).
 * This module is server-only (`.server.ts`).
 */

const DB_PATH =
  process.env.PORTFOLIO_DB_PATH ?? join(process.cwd(), ".data/portfolio.json");

interface Db {
  /** Map of userId → that user's holdings. */
  holdings: Record<string, Holding[]>;
}

/** Validate one untrusted holding record loaded from disk. */
function isHolding(value: unknown): value is Holding {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.symbol === "string" &&
    typeof v.quantity === "number" &&
    Number.isFinite(v.quantity) &&
    typeof v.costBasis === "number" &&
    Number.isFinite(v.costBasis)
  );
}

async function readDb(): Promise<Db> {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as { holdings?: unknown };
    if (parsed && typeof parsed.holdings === "object" && parsed.holdings !== null) {
      // Defensively rebuild from validated rows — never trust the file shape.
      const clean: Record<string, Holding[]> = {};
      for (const [userId, list] of Object.entries(
        parsed.holdings as Record<string, unknown>,
      )) {
        if (Array.isArray(list)) clean[userId] = list.filter(isHolding);
      }
      return { holdings: clean };
    }
    return { holdings: {} };
  } catch {
    return { holdings: {} };
  }
}

async function writeDb(db: Db): Promise<void> {
  await mkdir(dirname(DB_PATH), { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

/** Return a user's holdings (empty array if none). */
export async function getHoldings(userId: string): Promise<Holding[]> {
  const db = await readDb();
  return db.holdings[userId] ?? [];
}

export class HoldingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HoldingValidationError";
  }
}

/**
 * Append a holding for a user. Validates inputs (positive finite quantity and
 * cost basis, non-empty symbol); throws HoldingValidationError on bad input.
 * Returns the user's full holdings list after the add.
 */
export async function addHolding(
  userId: string,
  holding: Holding,
): Promise<Holding[]> {
  const symbol = holding.symbol.trim().toUpperCase();
  if (!symbol) throw new HoldingValidationError("Symbol is required.");
  if (!Number.isFinite(holding.quantity) || holding.quantity <= 0) {
    throw new HoldingValidationError("Quantity must be a positive number.");
  }
  if (!Number.isFinite(holding.costBasis) || holding.costBasis < 0) {
    throw new HoldingValidationError("Cost basis must be zero or positive.");
  }
  const db = await readDb();
  const list = db.holdings[userId] ?? [];
  list.push({ symbol, quantity: holding.quantity, costBasis: holding.costBasis });
  db.holdings[userId] = list;
  await writeDb(db);
  return list;
}

/**
 * Remove a holding by its position index in the user's list. Out-of-range
 * indices are a no-op. Returns the user's holdings after the removal.
 */
export async function removeHolding(
  userId: string,
  index: number,
): Promise<Holding[]> {
  const db = await readDb();
  const list = db.holdings[userId] ?? [];
  if (Number.isInteger(index) && index >= 0 && index < list.length) {
    list.splice(index, 1);
    db.holdings[userId] = list;
    await writeDb(db);
  }
  return list;
}
