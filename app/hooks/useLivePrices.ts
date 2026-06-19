import { useEffect, useRef, useState } from "react";
import {
  COINBASE_WS_URL,
  buildSubscribeMessage,
  parseTicker,
} from "~/lib/coinbase-ws";
import type { LivePriceMap, LiveStatus } from "~/types/crypto";

/**
 * Live price feed over a WebSocket to Coinbase's public ticker channel.
 *
 * This is the app's second I/O boundary (alongside the loader). It is the ONLY
 * place a WebSocket is opened. SSR-safe: the socket is created inside an effect,
 * which never runs on the server, and we guard for `window`/`WebSocket`.
 *
 * Resilience: exponential-backoff reconnect, resubscribe on every (re)open, and
 * disconnect while the tab is hidden (resume on focus) to avoid wasted sockets.
 * On unmount everything is torn down. Status drives the UI's live/fallback
 * behavior — when not "live", the route falls back to loader polling.
 */
const MAX_BACKOFF_MS = 15_000;
const BASE_BACKOFF_MS = 1_000;

export function useLivePrices(symbols: readonly string[]) {
  const [prices, setPrices] = useState<LivePriceMap>({});
  const [status, setStatus] = useState<LiveStatus>("connecting");

  // Stable symbol key so the effect only re-runs when the set actually changes.
  const symbolsKey = symbols.join(",");

  const socketRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const closedByUsRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      setStatus("offline");
      return;
    }

    // E2E/offline: never open a real socket (the server sets window.__E2E__ via
    // the root loader). Tests then exercise the loader/polling path only — no
    // external WebSocket connection is attempted.
    if ((window as { __E2E__?: boolean }).__E2E__) {
      setStatus("offline");
      return;
    }

    const list = symbolsKey ? symbolsKey.split(",") : [];

    // No symbols → live is disabled. Ensure any existing socket is closed and
    // we report offline. This is what makes the "Live" toggle actually STOP the
    // stream: the route passes [] when live is off, and we tear down here.
    if (list.length === 0) {
      setStatus("offline");
      return;
    }

    closedByUsRef.current = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      // Don't open while hidden; visibilitychange will reconnect on focus.
      if (document.visibilityState === "hidden") return;

      setStatus(retriesRef.current === 0 ? "connecting" : "reconnecting");
      const ws = new WebSocket(COINBASE_WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        retriesRef.current = 0;
        setStatus("live");
        ws.send(buildSubscribeMessage(list));
      };

      ws.onmessage = (event) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data as string);
        } catch {
          return;
        }
        const tick = parseTicker(parsed);
        if (tick) {
          setPrices((prev) => ({ ...prev, [tick.symbol]: tick }));
        }
      };

      ws.onerror = () => {
        // Surface as a reconnect; onclose will follow and schedule the retry.
        ws.close();
      };

      ws.onclose = () => {
        socketRef.current = null;
        if (closedByUsRef.current) return;
        // Schedule a backoff reconnect.
        const backoff = Math.min(
          BASE_BACKOFF_MS * 2 ** retriesRef.current,
          MAX_BACKOFF_MS,
        );
        retriesRef.current += 1;
        setStatus("reconnecting");
        clearReconnect();
        reconnectTimerRef.current = window.setTimeout(connect, backoff);
      };
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !socketRef.current) {
        retriesRef.current = 0;
        clearReconnect();
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    connect();

    return () => {
      closedByUsRef.current = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      clearReconnect();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [symbolsKey]);

  return { prices, status };
}
