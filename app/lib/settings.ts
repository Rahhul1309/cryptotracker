/**
 * User settings: types, defaults, accent presets, and PURE load/validate/merge
 * logic. No React, no direct DOM — the `useSettings` hook owns persistence and
 * applies the accent to CSS variables. Everything here is unit-tested.
 *
 * Persistence is forward-compatible: `mergeSettings` overlays a (possibly
 * partial, possibly stale) stored object onto the current defaults, so adding a
 * new setting later won't break a user's saved preferences.
 */

export type AccentKey = "gold" | "emerald" | "violet" | "crimson" | "azure";
export type Density = "comfortable" | "compact";
export type LayoutMode = "grid" | "list";

/**
 * Full visual themes. Unlike `accent` (which only swaps the highlight color), a
 * theme rewrites the entire palette + background + card treatment via a
 * `data-theme` attribute on <html> and matching CSS blocks in tailwind.css.
 */
export type ThemeKey =
  | "midnight" // default refined dark
  | "terminal" // developer / IDE
  | "ferrari" // Scuderia Ferrari F1
  | "gold"
  | "silver"
  | "cartoon"
  | "mario"
  | "sports"
  | "casual";

/**
 * Theme metadata. `egg` (optional) hints at hidden interactions in that theme —
 * surfaced as a tooltip in the picker. Order here drives the picker order, so
 * the two "magical" themes (Ferrari, Terminal) are listed first.
 */
export const THEMES: Record<
  ThemeKey,
  { label: string; blurb: string; egg?: string }
> = {
  ferrari: {
    label: "Ferrari",
    blurb: "Scuderia F1 — Rosso Corsa",
    egg: "🏎️ Toggle Live for an engine rev + an F1 car across the finish line. The rev pitch rises with market momentum.",
  },
  terminal: {
    label: "Terminal",
    blurb: "Dev / IDE syntax",
    egg: "🖥️ Matrix rain + CRT glow. Try the Konami code (↑↑↓↓←→←→ B A), type hodl / moon / satoshi / lambo, or open the devtools console.",
  },
  midnight: { label: "Midnight", blurb: "Refined dark" },
  gold: { label: "Gold", blurb: "Black & gold luxe" },
  silver: { label: "Silver", blurb: "Cool platinum" },
  cartoon: { label: "Cartoon", blurb: "Bold & playful" },
  mario: { label: "Mario", blurb: "Retro arcade" },
  sports: { label: "Sports", blurb: "Stadium energy" },
  casual: { label: "Casual", blurb: "Soft daylight" },
};

export type ColorMode = "dark" | "light";

export interface Settings {
  theme: ThemeKey;
  /** Dark or light variant of the active theme (every theme supports both). */
  mode: ColorMode;
  accent: AccentKey;
  density: Density;
  layout: LayoutMode;
  /** Master switch for the live WebSocket feed. Off → loader + polling only. */
  liveEnabled: boolean;
  showTicker: boolean;
  showSparklines: boolean;
  showAurora: boolean;
  showBtcColumn: boolean;
  /** Decimal places for USD prices ≥ 1 (small prices always get more). */
  precision: number;
  /** Polling interval (seconds) used as fallback when live is off/disconnected. */
  refreshSeconds: number;
  /** Symbols the user has hidden from the dashboard. */
  hidden: string[];
  /** Symbols pinned to the top, in pin order. */
  pinned: string[];
  /** Symbols starred into the watchlist (a favorites *view*). */
  watchlist: string[];
  /**
   * Extra coins the user added via search to TRACK (beyond the curated
   * defaults). These are fetched by the loader and subscribed to in live mode.
   * Distinct from `watchlist`: tracking = "show & price this coin"; watchlist =
   * "mark this tracked coin as a favorite". Deleting a tracked coin removes it
   * here. See [[search-vs-watchlist]].
   */
  tracked: string[];
}

export const ACCENTS: Record<
  AccentKey,
  { label: string; value: string; soft: string }
> = {
  gold: { label: "Gold", value: "#e7b649", soft: "#f5d98b" },
  emerald: { label: "Emerald", value: "#34d399", soft: "#6ee7b7" },
  violet: { label: "Violet", value: "#a78bfa", soft: "#c4b5fd" },
  crimson: { label: "Crimson", value: "#fb7185", soft: "#fda4af" },
  azure: { label: "Azure", value: "#38bdf8", soft: "#7dd3fc" },
};

export const REFRESH_OPTIONS = [10, 30, 60, 120] as const;
export const PRECISION_MIN = 2;
export const PRECISION_MAX = 6;

export const DEFAULT_SETTINGS: Settings = {
  theme: "midnight",
  mode: "dark",
  accent: "gold",
  density: "comfortable",
  layout: "grid",
  liveEnabled: true,
  showTicker: true,
  showSparklines: true,
  showAurora: false, // refined default: off (less "AI blob" by default)
  showBtcColumn: true,
  precision: 2,
  refreshSeconds: 30,
  hidden: [],
  pinned: [],
  watchlist: [],
  tracked: [],
};

export const SETTINGS_STORAGE_KEY = "crypto-dashboard:settings";

function clampNumber(n: unknown, min: number, max: number, fallback: number) {
  return typeof n === "number" && Number.isFinite(n)
    ? Math.min(max, Math.max(min, Math.round(n)))
    : fallback;
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((s) => typeof s === "string")
    ? (value as string[])
    : null;
}

/**
 * Merge an unknown (stored/partial) value onto defaults, validating each field.
 * Unknown/invalid fields fall back to the default — never throws.
 */
export function mergeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (typeof raw !== "object" || raw === null) return { ...d };
  const r = raw as Record<string, unknown>;

  const theme: ThemeKey =
    typeof r.theme === "string" && r.theme in THEMES
      ? (r.theme as ThemeKey)
      : d.theme;
  const accent: AccentKey =
    typeof r.accent === "string" && r.accent in ACCENTS
      ? (r.accent as AccentKey)
      : d.accent;
  const density: Density = r.density === "compact" ? "compact" : d.density;
  const layout: LayoutMode = r.layout === "list" ? "list" : d.layout;
  const bool = (v: unknown, fb: boolean) =>
    typeof v === "boolean" ? v : fb;

  return {
    theme,
    mode: r.mode === "light" ? "light" : "dark",
    accent,
    density,
    layout,
    liveEnabled: bool(r.liveEnabled, d.liveEnabled),
    showTicker: bool(r.showTicker, d.showTicker),
    showSparklines: bool(r.showSparklines, d.showSparklines),
    showAurora: bool(r.showAurora, d.showAurora),
    showBtcColumn: bool(r.showBtcColumn, d.showBtcColumn),
    precision: clampNumber(r.precision, PRECISION_MIN, PRECISION_MAX, d.precision),
    refreshSeconds: clampNumber(r.refreshSeconds, 5, 600, d.refreshSeconds),
    hidden: stringArray(r.hidden) ?? d.hidden,
    pinned: stringArray(r.pinned) ?? d.pinned,
    watchlist: stringArray(r.watchlist) ?? d.watchlist,
    tracked: stringArray(r.tracked) ?? d.tracked,
  };
}

/** Parse a JSON string from storage into validated Settings. */
export function parseSettings(json: string | null): Settings {
  if (!json) return { ...DEFAULT_SETTINGS };
  try {
    return mergeSettings(JSON.parse(json));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Compute the settings change for REMOVING a coin from the dashboard, for ANY
 * coin (curated default or user-added). Returns only the fields that change.
 *
 * The split exists because the two kinds of coin are removed differently:
 *  - a user-added coin lives in `tracked`     → drop it from `tracked`
 *  - a curated default isn't in `tracked`     → hide it via `hidden`
 * Either way it's also dropped from the watchlist so it can't linger there.
 *
 * `defaultSymbols` is the curated set, used to decide which mechanism applies —
 * passing it keeps this pure (no import of crypto-config).
 */
export function removeCoinPatch(
  settings: Pick<Settings, "tracked" | "hidden" | "watchlist">,
  symbol: string,
  defaultSymbols: readonly string[],
): Partial<Settings> {
  const patch: Partial<Settings> = {};

  if (settings.tracked.includes(symbol)) {
    patch.tracked = settings.tracked.filter((s) => s !== symbol);
  }
  // A curated default can't be dropped from `tracked` (it isn't there), so hide
  // it. A user-added coin is removed via `tracked` above and must NOT also be
  // hidden — otherwise re-adding it later would leave a stale hidden entry that
  // keeps it invisible.
  if (defaultSymbols.includes(symbol) && !settings.hidden.includes(symbol)) {
    patch.hidden = [...settings.hidden, symbol];
  }
  if (settings.watchlist.includes(symbol)) {
    patch.watchlist = settings.watchlist.filter((s) => s !== symbol);
  }
  return patch;
}

/**
 * Compute the settings change for ADDING (tracking) a coin from search, for ANY
 * coin. Returns only the fields that change.
 *
 * Adding must always make the coin VISIBLE again — so it un-hides the symbol if
 * it was previously removed. Without this, re-adding a deleted default coin
 * shows "✓ Tracking" in search yet the card never reappears (it's still in
 * `hidden`). User-added coins also go into `tracked` (defaults are already
 * fetched by the loader, so they only need un-hiding).
 */
export function addCoinPatch(
  settings: Pick<Settings, "tracked" | "hidden">,
  symbol: string,
  defaultSymbols: readonly string[],
): Partial<Settings> {
  const patch: Partial<Settings> = {};

  if (settings.hidden.includes(symbol)) {
    patch.hidden = settings.hidden.filter((s) => s !== symbol);
  }
  // Only non-defaults need to be added to `tracked`; defaults are always fetched.
  if (!defaultSymbols.includes(symbol) && !settings.tracked.includes(symbol)) {
    patch.tracked = [...settings.tracked, symbol];
  }
  return patch;
}

/**
 * Apply pin/hide preferences to an ordered list of items (keyed by symbol).
 * Hidden symbols are removed; pinned symbols are moved to the front in pin
 * order. Pure — used by the route after drag-order + filter resolve.
 */
export function applyVisibilityAndPins<T extends { symbol: string }>(
  items: readonly T[],
  hidden: readonly string[],
  pinned: readonly string[],
): T[] {
  const hiddenSet = new Set(hidden);
  const visible = items.filter((i) => !hiddenSet.has(i.symbol));
  const pinnedRank = new Map(pinned.map((s, i) => [s, i]));

  return [...visible].sort((a, b) => {
    const ap = pinnedRank.has(a.symbol);
    const bp = pinnedRank.has(b.symbol);
    if (ap && bp) return pinnedRank.get(a.symbol)! - pinnedRank.get(b.symbol)!;
    if (ap) return -1;
    if (bp) return 1;
    return 0; // preserve existing relative order for unpinned
  });
}
