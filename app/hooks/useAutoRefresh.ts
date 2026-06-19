import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "@remix-run/react";

/**
 * Periodically revalidates the Remix loader. Used two ways:
 *  - as a user-toggleable auto-refresh, and
 *  - as an automatic fallback when the live WebSocket feed is down (the route
 *    passes `forceEnabled` based on live status).
 *
 * We revalidate (re-run the loader) rather than client-fetch so there is a
 * single data path and the Coinbase REST call stays server-side.
 *
 * The revalidator is held in a ref so its changing identity (idle→loading→idle)
 * does NOT tear down and recreate the interval each cycle — the effect depends
 * only on the actual on/off state and the interval length.
 */
export function useAutoRefresh(intervalMs: number, forceEnabled = false) {
  const revalidator = useRevalidator();
  const [userEnabled, setUserEnabled] = useState(false);

  // Keep a live ref to the revalidator without re-subscribing the interval.
  const revalidatorRef = useRef(revalidator);
  revalidatorRef.current = revalidator;

  const active = userEnabled || forceEnabled;

  useEffect(() => {
    if (!active) return;

    const tick = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      const r = revalidatorRef.current;
      if (r.state === "idle") r.revalidate();
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);

  return {
    /** Whether the user explicitly turned auto-refresh on (for the toggle UI). */
    enabled: userEnabled,
    toggle: () => setUserEnabled((e) => !e),
    isRefreshing: revalidator.state !== "idle",
    refreshNow: () => revalidator.revalidate(),
  };
}
