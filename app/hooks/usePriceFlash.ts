import { useEffect, useRef, useState } from "react";

export type FlashDirection = "up" | "down" | null;

/**
 * Returns a flash direction whenever `value` changes between renders (i.e. on
 * data refresh). The flash auto-clears after the animation window so it can
 * re-trigger on the next change. First render never flashes.
 */
export function usePriceFlash(value: number | null, durationMs = 900) {
  const previous = useRef<number | null>(value);
  const [flash, setFlash] = useState<FlashDirection>(null);

  useEffect(() => {
    const prev = previous.current;
    if (prev !== null && value !== null && value !== prev) {
      setFlash(value > prev ? "up" : "down");
      const id = window.setTimeout(() => setFlash(null), durationMs);
      previous.current = value;
      return () => window.clearTimeout(id);
    }
    previous.current = value;
  }, [value, durationMs]);

  return flash;
}
