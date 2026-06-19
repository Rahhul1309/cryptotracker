import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "~/lib/settings";
import { normalizePrefs } from "~/lib/prefs";

/**
 * Tests for the PURE server-side normalization wrapper used by the prefs store
 * and the /api/preferences route. We exercise the boundary behaviour the store
 * relies on (sanitizing untrusted/stale input) without touching the file store
 * — these stay deterministic and fs-free.
 */
describe("normalizePrefs", () => {
  it("returns defaults for non-objects / nullish input", () => {
    expect(normalizePrefs(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizePrefs(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizePrefs("not-an-object")).toEqual(DEFAULT_SETTINGS);
    expect(normalizePrefs(123)).toEqual(DEFAULT_SETTINGS);
  });

  it("drops unknown keys (forward-compatible)", () => {
    const result = normalizePrefs({ accent: "azure", futureFlag: true, junk: 1 });
    expect(result.accent).toBe("azure");
    expect(result).not.toHaveProperty("futureFlag");
    expect(result).not.toHaveProperty("junk");
    // Result has exactly the canonical Settings keys.
    expect(Object.keys(result).sort()).toEqual(
      Object.keys(DEFAULT_SETTINGS).sort(),
    );
  });

  it("overlays valid partial prefs onto defaults", () => {
    const result = normalizePrefs({ theme: "gold", density: "compact" });
    expect(result.theme).toBe("gold");
    expect(result.density).toBe("compact");
    // Untouched fields keep defaults.
    expect(result.layout).toBe(DEFAULT_SETTINGS.layout);
    expect(result.watchlist).toEqual(DEFAULT_SETTINGS.watchlist);
  });

  it("clamps out-of-range numeric values", () => {
    expect(normalizePrefs({ precision: 999 }).precision).toBe(6);
    expect(normalizePrefs({ precision: -10 }).precision).toBe(2);
    expect(normalizePrefs({ refreshSeconds: 100000 }).refreshSeconds).toBe(600);
    expect(normalizePrefs({ refreshSeconds: 1 }).refreshSeconds).toBe(5);
  });

  it("rejects invalid enum values, falling back to defaults", () => {
    const result = normalizePrefs({
      theme: "neon",
      accent: "rainbow",
      layout: "spiral",
    });
    expect(result.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(result.accent).toBe(DEFAULT_SETTINGS.accent);
    expect(result.layout).toBe(DEFAULT_SETTINGS.layout);
  });

  it("validates symbol arrays, ignoring non-string-array values", () => {
    expect(normalizePrefs({ watchlist: ["BTC", "ETH"] }).watchlist).toEqual([
      "BTC",
      "ETH",
    ]);
    expect(normalizePrefs({ pinned: [1, 2, 3] }).pinned).toEqual(
      DEFAULT_SETTINGS.pinned,
    );
    expect(normalizePrefs({ hidden: "BTC" }).hidden).toEqual(
      DEFAULT_SETTINGS.hidden,
    );
  });

  it("coerces invalid boolean flags back to defaults", () => {
    const result = normalizePrefs({ liveEnabled: "yes", showTicker: 0 });
    expect(result.liveEnabled).toBe(DEFAULT_SETTINGS.liveEnabled);
    expect(result.showTicker).toBe(DEFAULT_SETTINGS.showTicker);
  });

  it("produces a full, valid Settings even from an empty object", () => {
    expect(normalizePrefs({})).toEqual(DEFAULT_SETTINGS);
  });
});
