import { useCallback, useEffect, useState } from "react";

/**
 * Dark/light theme state synced to <html class="dark"> and localStorage.
 *
 * The initial class is set by a blocking inline script in root.tsx (before
 * paint) to avoid a flash of the wrong theme. This hook reads the already-
 * applied class on mount so React state agrees with the DOM, then owns
 * toggles afterward.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "crypto-dashboard:theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      const root = document.documentElement;
      root.classList.toggle("dark", next === "dark");
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}

/**
 * Inline script source that runs before React hydration to set the theme
 * class, preventing a flash. Kept here so the storage key stays in one place.
 */
export const themeBootstrapScript = `
(function() {
  var root = document.documentElement;
  try {
    // Apply the saved theme + mode + accent before paint to avoid any flash.
    var s = JSON.parse(localStorage.getItem('crypto-dashboard:settings') || '{}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var mode = (s && (s.mode === 'light' || s.mode === 'dark'))
      ? s.mode
      : (prefersDark ? 'dark' : 'light');
    root.setAttribute('data-mode', mode);
    root.classList.toggle('dark', mode === 'dark');
    if (s && typeof s.theme === 'string') root.setAttribute('data-theme', s.theme);
    var accents = {
      gold: ['#e7b649', '#f5d98b'], emerald: ['#34d399', '#6ee7b7'],
      violet: ['#a78bfa', '#c4b5fd'], crimson: ['#fb7185', '#fda4af'],
      azure: ['#38bdf8', '#7dd3fc']
    };
    var a = accents[s && s.accent];
    if (a) {
      root.style.setProperty('--accent', a[0]);
      root.style.setProperty('--accent-soft', a[1]);
      root.style.setProperty('--glow', a[0]);
    }
  } catch (e) {}
})();
`;
