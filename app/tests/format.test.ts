import { describe, expect, it } from "vitest";
import { formatUsd, formatPct, formatBtc } from "~/lib/format";

describe("formatUsd", () => {
  it("returns em-dash for null", () => {
    expect(formatUsd(null)).toBe("—");
  });

  it("uses the base precision as the max for values ≥ 1", () => {
    // precision 2 rounds to 2 dp
    expect(formatUsd(68412.499, 2)).toBe("$68,412.50");
    // precision 4 reveals more dp when the value has them (no fake trailing 0s)
    expect(formatUsd(68412.4987, 4)).toBe("$68,412.4987");
    // a value with no extra dp still shows the minimum 2
    expect(formatUsd(68412.5, 4)).toBe("$68,412.50");
  });

  it("always gives sub-dollar values extra precision regardless of setting", () => {
    // base precision 2 but value < 0.01 → 8 dp so it stays legible
    expect(formatUsd(0.00001234, 2)).toContain("0.00001234");
  });
});

describe("formatPct", () => {
  it("signs and fixes to 2 dp, em-dash for null", () => {
    expect(formatPct(1.234)).toBe("+1.23%");
    expect(formatPct(-0.5)).toBe("-0.50%");
    expect(formatPct(null)).toBe("—");
  });
});

describe("formatBtc", () => {
  it("prefixes the BTC glyph, em-dash for null", () => {
    expect(formatBtc(null)).toBe("—");
    expect(formatBtc(0.05)).toContain("₿");
  });
});
