import type { ColorMode } from "~/lib/settings";

/**
 * Dark/light mode toggle. Controlled by the app settings (`settings.mode`) so it
 * works for EVERY theme — each theme has both a dark and a light palette
 * (tailwind.css responds to `data-mode`). Toggling flips the active theme's mode.
 */
export function ThemeToggle({
  mode,
  onToggle,
}: {
  mode: ColorMode;
  onToggle: () => void;
}) {
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg-1 text-ink-1 shadow-sm transition hover:border-gold/40 hover:text-gold-soft"
    >
      {isDark ? (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0 1a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm8-5a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM4 10a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm12.07-5.66a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.7-.71a1 1 0 0 1 1.42 0ZM6.05 14.36a1 1 0 0 1 0 1.41l-.71.71a1 1 0 0 1-1.41-1.42l.7-.7a1 1 0 0 1 1.42 0Zm9.31 1.41a1 1 0 0 1-1.41 0l-.71-.71a1 1 0 0 1 1.41-1.41l.71.7a1 1 0 0 1 0 1.42ZM5.34 5.34a1 1 0 0 1-1.41 0l-.71-.71A1 1 0 0 1 4.63 3.2l.71.71a1 1 0 0 1 0 1.42Z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586Z" />
        </svg>
      )}
    </button>
  );
}
