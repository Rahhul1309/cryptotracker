import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyOrder,
  loadOrder,
  reorder,
  saveOrder,
  type HasSymbol,
} from "~/lib/order-storage";

/**
 * Owns the user's card order, layered on top of fresh loader data.
 *
 * Design notes:
 * - `items` (from the loader) is the source of truth for *content* (live
 *   rates). This hook only controls *sequence*, keyed by symbol.
 * - The persisted order is read once on mount (client-only, avoids SSR
 *   hydration mismatch since the server can't see localStorage).
 * - When live data refreshes, the current order is reapplied so reordering
 *   survives auto/manual refresh.
 */
export function useCardOrder<T extends HasSymbol>(items: readonly T[]) {
  // Sequence of symbols. Initialized from default order, hydrated from storage.
  const [order, setOrder] = useState<string[]>(() =>
    items.map((i) => i.symbol),
  );

  // Hydrate persisted order on mount (client only).
  useEffect(() => {
    const stored = loadOrder();
    if (stored) {
      setOrder(
        applyOrder(items, stored).map((i) => i.symbol),
      );
    }
    // Only on mount: subsequent item changes are reconciled in `ordered` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply current order to the latest items (reconciles added/removed coins).
  const ordered = useMemo(
    () => applyOrder(items, order),
    [items, order],
  );

  const move = useCallback((from: number, to: number) => {
    setOrder((prev) => {
      const next = reorder(prev, from, to);
      saveOrder(next);
      return next;
    });
  }, []);

  // Move by symbol — convenient for dnd-kit which works in terms of ids.
  const moveBySymbol = useCallback(
    (activeSymbol: string, overSymbol: string) => {
      setOrder((prev) => {
        const from = prev.indexOf(activeSymbol);
        const to = prev.indexOf(overSymbol);
        const next = reorder(prev, from, to);
        saveOrder(next);
        return next;
      });
    },
    [],
  );

  return { ordered, move, moveBySymbol };
}
