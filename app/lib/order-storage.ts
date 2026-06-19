/**
 * Ordering utilities + localStorage persistence for card order.
 *
 * Order is stored as an array of symbols (the stable identity from
 * crypto-config). Storing symbols rather than indices means the saved order
 * survives adding/removing coins from the tracked list: unknown symbols are
 * ignored on read, and newly-added symbols are appended in their default
 * position. The reorder math (`applyOrder`, `reorder`) is pure and tested;
 * only `loadOrder`/`saveOrder` touch the browser.
 */

const STORAGE_KEY = "crypto-dashboard:order";

export interface HasSymbol {
  symbol: string;
}

/**
 * Reorder `items` to match the sequence of symbols in `order`.
 * Items whose symbol is absent from `order` are appended, preserving their
 * original relative order (handles newly-tracked coins gracefully).
 */
export function applyOrder<T extends HasSymbol>(
  items: readonly T[],
  order: readonly string[],
): T[] {
  const bySymbol = new Map(items.map((i) => [i.symbol, i]));
  const seen = new Set<string>();
  const ordered: T[] = [];

  for (const symbol of order) {
    const item = bySymbol.get(symbol);
    if (item && !seen.has(symbol)) {
      ordered.push(item);
      seen.add(symbol);
    }
  }
  for (const item of items) {
    if (!seen.has(item.symbol)) ordered.push(item);
  }
  return ordered;
}

/** Pure array move used by drag-and-drop (move item from `from` to `to`). */
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

/** Read persisted symbol order. Returns null if absent or unreadable. */
export function loadOrder(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((s): s is string => typeof s === "string")
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist symbol order. Silently no-ops if storage is unavailable. */
export function saveOrder(order: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* quota or privacy mode — ignore, order still persists in memory */
  }
}
