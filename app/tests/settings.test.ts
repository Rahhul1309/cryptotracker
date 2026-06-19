import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  applyVisibilityAndPins,
  mergeSettings,
  parseSettings,
} from "~/lib/settings";

describe("mergeSettings", () => {
  it("returns defaults for non-objects", () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings(42)).toEqual(DEFAULT_SETTINGS);
  });

  it("overlays valid partial settings onto defaults", () => {
    const merged = mergeSettings({ accent: "violet", density: "compact" });
    expect(merged.accent).toBe("violet");
    expect(merged.density).toBe("compact");
    // untouched fields keep defaults
    expect(merged.layout).toBe(DEFAULT_SETTINGS.layout);
    expect(merged.showTicker).toBe(DEFAULT_SETTINGS.showTicker);
  });

  it("rejects invalid enum values, falling back to defaults", () => {
    const merged = mergeSettings({ accent: "neon", density: "weird", layout: "x" });
    expect(merged.accent).toBe(DEFAULT_SETTINGS.accent);
    expect(merged.density).toBe(DEFAULT_SETTINGS.density);
    expect(merged.layout).toBe(DEFAULT_SETTINGS.layout);
  });

  it("clamps precision into range", () => {
    expect(mergeSettings({ precision: 99 }).precision).toBe(6);
    expect(mergeSettings({ precision: -3 }).precision).toBe(2);
    expect(mergeSettings({ precision: "x" }).precision).toBe(
      DEFAULT_SETTINGS.precision,
    );
  });

  it("validates hidden/pinned as string arrays", () => {
    expect(mergeSettings({ hidden: ["BTC", "ETH"] }).hidden).toEqual([
      "BTC",
      "ETH",
    ]);
    expect(mergeSettings({ hidden: [1, 2] }).hidden).toEqual(
      DEFAULT_SETTINGS.hidden,
    );
    expect(mergeSettings({ pinned: "BTC" }).pinned).toEqual(
      DEFAULT_SETTINGS.pinned,
    );
  });

  it("is forward-compatible: ignores unknown keys", () => {
    const merged = mergeSettings({ futureFlag: true, accent: "azure" });
    expect(merged.accent).toBe("azure");
    expect(merged).not.toHaveProperty("futureFlag");
  });

  it("validates color mode, defaulting to dark", () => {
    expect(mergeSettings({ mode: "light" }).mode).toBe("light");
    expect(mergeSettings({ mode: "dark" }).mode).toBe("dark");
    expect(mergeSettings({ mode: "neon" }).mode).toBe("dark");
    expect(mergeSettings({}).mode).toBe(DEFAULT_SETTINGS.mode);
  });

  it("validates the tracked list as a string array", () => {
    expect(mergeSettings({ tracked: ["UNI", "ATOM"] }).tracked).toEqual([
      "UNI",
      "ATOM",
    ]);
    expect(mergeSettings({ tracked: [1, true] }).tracked).toEqual(
      DEFAULT_SETTINGS.tracked,
    );
  });
});

describe("parseSettings", () => {
  it("returns defaults for null or invalid JSON", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{not json")).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips valid JSON through validation", () => {
    const json = JSON.stringify({ accent: "emerald", precision: 4 });
    const parsed = parseSettings(json);
    expect(parsed.accent).toBe("emerald");
    expect(parsed.precision).toBe(4);
  });
});

describe("applyVisibilityAndPins", () => {
  const items = [
    { symbol: "BTC" },
    { symbol: "ETH" },
    { symbol: "SOL" },
    { symbol: "DOGE" },
  ];

  it("removes hidden symbols", () => {
    expect(
      applyVisibilityAndPins(items, ["ETH", "DOGE"], []).map((i) => i.symbol),
    ).toEqual(["BTC", "SOL"]);
  });

  it("moves pinned symbols to the front in pin order", () => {
    expect(
      applyVisibilityAndPins(items, [], ["SOL", "BTC"]).map((i) => i.symbol),
    ).toEqual(["SOL", "BTC", "ETH", "DOGE"]);
  });

  it("preserves relative order of unpinned items", () => {
    expect(
      applyVisibilityAndPins(items, [], ["DOGE"]).map((i) => i.symbol),
    ).toEqual(["DOGE", "BTC", "ETH", "SOL"]);
  });

  it("hides and pins together (hidden wins)", () => {
    expect(
      applyVisibilityAndPins(items, ["BTC"], ["BTC", "SOL"]).map(
        (i) => i.symbol,
      ),
    ).toEqual(["SOL", "ETH", "DOGE"]);
  });

  it("does not mutate the input", () => {
    const copy = items.map((i) => ({ ...i }));
    applyVisibilityAndPins(items, ["BTC"], ["SOL"]);
    expect(items).toEqual(copy);
  });
});
