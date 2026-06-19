import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACCENTS,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  parseSettings,
  mergeSettings,
  type Settings,
} from "~/lib/settings";

/**
 * Owns user settings and keeps them in sync across THREE places:
 *  1. localStorage — instant, device-local, survives logout.
 *  2. The server (`/api/preferences`) — per-user, so theme/watchlist/etc. follow
 *     the account across devices and sessions. Server prefs win on load.
 *  3. CSS variables / `data-theme` — applied so the whole UI re-themes.
 *
 * Flow: hydrate from localStorage immediately (no flash), then fetch the user's
 * server prefs and adopt them; thereafter every change writes localStorage now
 * and POSTs to the server debounced.
 *
 * `update` does a shallow merge so callers can change one field at a time.
 */
const PREFS_API = "/api/preferences";
const SAVE_DEBOUNCE_MS = 600;

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<number | null>(null);
  // Skip the server POST for changes that came FROM the server hydrate.
  const skipNextSave = useRef(false);
  // True once the user has made a local change — prevents the async server
  // hydrate from clobbering an interaction that happened before it resolved.
  const userTouched = useRef(false);
  // Always-current settings, for flushPrefs() to read without stale closures.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // 1. Hydrate from localStorage immediately (client-only → no SSR mismatch).
  useEffect(() => {
    setSettings(parseSettings(window.localStorage.getItem(SETTINGS_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  // 2. Then pull the logged-in user's server prefs and adopt them (server wins).
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(PREFS_API, { headers: { Accept: "application/json" } });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { prefs?: unknown };
        // If the user already interacted while this request was in flight, keep
        // their change — don't overwrite it with the loaded server prefs.
        if (cancelled || !body.prefs || userTouched.current) return;
        skipNextSave.current = true; // adopting server state, don't echo it back
        setSettings(mergeSettings(body.prefs));
      } catch {
        /* offline / not logged in → keep localStorage values */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  // 3. On any change: apply theme/accent, persist locally, debounce-save server.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
    } catch {
      /* ignore quota / privacy mode */
    }
    const root = document.documentElement;

    // Apply the full theme + dark/light mode (the CSS responds to both
    // data-theme and data-mode — see tailwind.css selector contract). Keep the
    // legacy `.dark` class in sync for any remaining `:not(.dark)` rules.
    root.setAttribute("data-theme", settings.theme);
    root.setAttribute("data-mode", settings.mode);
    root.classList.toggle("dark", settings.mode === "dark");

    // Accent is a deliberate user choice layered ON TOP of the theme: set the
    // real --accent vars inline so it overrides the theme's default accent.
    const accent = ACCENTS[settings.accent];
    root.style.setProperty("--accent", accent.value);
    root.style.setProperty("--accent-soft", accent.soft);
    root.style.setProperty("--glow", accent.value);

    // Persist to the server (debounced), unless this change WAS the server load.
    if (skipNextSave.current) {
      skipNextSave.current = false;
    } else {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void fetch(PREFS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefs: settings }),
        }).catch(() => {
          /* not logged in / offline — localStorage still holds the value */
        });
      }, SAVE_DEBOUNCE_MS);
    }
  }, [settings, hydrated]);

  // Flush the latest prefs to the server when the page is hidden/unloaded, so a
  // quick change followed by a reload/navigation isn't lost to the debounce.
  // `sendBeacon` is delivered reliably during unload (a normal fetch may be
  // cancelled). Without this, the server keeps stale prefs and "wins" on the
  // next load, reverting the user's last change.
  useEffect(() => {
    if (!hydrated) return;
    const flushOnHide = () => {
      if (document.visibilityState !== "hidden") return;
      if (!userTouched.current) return;
      try {
        const blob = new Blob([JSON.stringify({ prefs: settingsRef.current })], {
          type: "application/json",
        });
        navigator.sendBeacon(PREFS_API, blob);
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushOnHide);
    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushOnHide);
    };
  }, [hydrated]);

  const update = useCallback((patch: Partial<Settings>) => {
    userTouched.current = true;
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    userTouched.current = true;
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const toggleIn = useCallback(
    (key: "hidden" | "pinned" | "watchlist" | "tracked", symbol: string) => {
      userTouched.current = true;
      setSettings((prev) => {
        const list = prev[key];
        const next = list.includes(symbol)
          ? list.filter((s) => s !== symbol)
          : [...list, symbol];
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  /**
   * Persist the latest settings to the server IMMEDIATELY (cancelling any
   * pending debounce) and resolve when the server has committed them. Callers
   * that need the loader to see a change right away (e.g. tracking a coin, which
   * triggers a loader revalidation) await this first to avoid a save↔revalidate
   * race where the loader reads stale prefs.
   */
  const flushPrefs = useCallback(async () => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      await fetch(PREFS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: settingsRef.current }),
      });
    } catch {
      /* offline / not logged in — localStorage still holds the value */
    }
  }, []);

  return { settings, update, reset, toggleIn, flushPrefs, hydrated };
}
