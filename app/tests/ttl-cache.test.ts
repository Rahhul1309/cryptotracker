import { describe, expect, it } from "vitest";
import { TtlCache } from "~/lib/ttl-cache";

describe("TtlCache", () => {
  it("returns a value within its TTL", () => {
    const cache = new TtlCache<string, number>(1000);
    cache.set("a", 42, 0);
    expect(cache.get("a", 500)).toBe(42);
    expect(cache.get("a", 999)).toBe(42);
  });

  it("expires a value at/after its TTL", () => {
    const cache = new TtlCache<string, number>(1000);
    cache.set("a", 42, 0);
    expect(cache.get("a", 1000)).toBeUndefined();
    expect(cache.get("a", 5000)).toBeUndefined();
  });

  it("returns undefined for unknown keys", () => {
    const cache = new TtlCache<string, number>(1000);
    expect(cache.get("missing", 0)).toBeUndefined();
  });

  it("refreshes the expiry on re-set", () => {
    const cache = new TtlCache<string, number>(1000);
    cache.set("a", 1, 0);
    cache.set("a", 2, 900); // resets expiry to 1900
    expect(cache.get("a", 1500)).toBe(2);
    expect(cache.get("a", 1899)).toBe(2);
    expect(cache.get("a", 1900)).toBeUndefined();
  });
});
