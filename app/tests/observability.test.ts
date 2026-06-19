import { describe, expect, it } from "vitest";
import {
  buildLogRecord,
  resolveLevel,
  shouldLog,
  usePretty,
} from "~/lib/observability/logger.server";
import { newRequestId } from "~/lib/observability/request-id.server";
import { formatDuration } from "~/lib/observability/timing.server";
import {
  MetricsRegistry,
  seriesKey,
} from "~/lib/observability/metrics.server";

// Deterministic clock for record-shape assertions — never use the wall clock.
const FIXED = new Date("2026-06-19T00:00:00.000Z");

describe("buildLogRecord", () => {
  it("produces the canonical record shape", () => {
    const record = buildLogRecord("info", "hello", { a: 1 }, undefined, FIXED);
    expect(record).toEqual({
      ts: "2026-06-19T00:00:00.000Z",
      level: "info",
      msg: "hello",
      fields: { a: 1 },
    });
  });

  it("always includes a fields object, even with no fields", () => {
    const record = buildLogRecord("debug", "noop", undefined, undefined, FIXED);
    expect(record.fields).toEqual({});
  });

  it("merges bindings under call-site fields (call-site wins)", () => {
    const record = buildLogRecord(
      "warn",
      "merge",
      { a: "call", b: 2 },
      { a: "bind", c: 3 },
      FIXED,
    );
    expect(record.fields).toEqual({ a: "call", b: 2, c: 3 });
  });

  it("lifts requestId out of bindings into a top-level field", () => {
    const record = buildLogRecord(
      "info",
      "req",
      { route: "_index" },
      { requestId: "abc-123" },
      FIXED,
    );
    expect(record.requestId).toBe("abc-123");
    expect(record.fields).toEqual({ route: "_index" });
    expect(record.fields).not.toHaveProperty("requestId");
  });

  it("omits requestId when none is supplied", () => {
    const record = buildLogRecord("info", "x", undefined, undefined, FIXED);
    expect(record).not.toHaveProperty("requestId");
  });

  it("ignores a non-string requestId rather than lifting it", () => {
    const record = buildLogRecord("info", "x", { requestId: 42 }, {}, FIXED);
    expect(record).not.toHaveProperty("requestId");
    expect(record.fields).not.toHaveProperty("requestId");
  });
});

describe("shouldLog", () => {
  it("emits at or above the minimum level", () => {
    expect(shouldLog("info", "info")).toBe(true);
    expect(shouldLog("error", "info")).toBe(true);
    expect(shouldLog("warn", "debug")).toBe(true);
  });

  it("suppresses below the minimum level", () => {
    expect(shouldLog("debug", "info")).toBe(false);
    expect(shouldLog("info", "warn")).toBe(false);
    expect(shouldLog("warn", "error")).toBe(false);
  });
});

describe("resolveLevel", () => {
  it("honors a valid LOG_LEVEL", () => {
    expect(resolveLevel("debug", "production")).toBe("debug");
    expect(resolveLevel("error", undefined)).toBe("error");
  });

  it("defaults to info, and to warn under test", () => {
    expect(resolveLevel(undefined, "production")).toBe("info");
    expect(resolveLevel(undefined, undefined)).toBe("info");
    expect(resolveLevel(undefined, "test")).toBe("warn");
  });

  it("falls back for an invalid LOG_LEVEL", () => {
    expect(resolveLevel("loud", "production")).toBe("info");
    expect(resolveLevel("loud", "test")).toBe("warn");
  });
});

describe("usePretty", () => {
  it("forces pretty when LOG_PRETTY=1", () => {
    expect(usePretty("1", "production")).toBe(true);
  });

  it("is pretty outside production, JSON in production", () => {
    expect(usePretty(undefined, "development")).toBe(true);
    expect(usePretty(undefined, "test")).toBe(true);
    expect(usePretty(undefined, "production")).toBe(false);
  });
});

describe("formatDuration", () => {
  it("renders sub-millisecond durations as microseconds", () => {
    expect(formatDuration(0)).toBe("0µs");
    expect(formatDuration(0.5)).toBe("500µs");
  });

  it("renders milliseconds with one decimal", () => {
    expect(formatDuration(1)).toBe("1ms");
    expect(formatDuration(12.34)).toBe("12.3ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("renders seconds for >= 1000ms", () => {
    expect(formatDuration(1000)).toBe("1s");
    expect(formatDuration(1500)).toBe("1.5s");
  });

  it("clamps invalid input to 0ms", () => {
    expect(formatDuration(-5)).toBe("0ms");
    expect(formatDuration(NaN)).toBe("0ms");
  });
});

describe("newRequestId", () => {
  it("produces a v4-shaped UUID", () => {
    const id = newRequestId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("is unique across many calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newRequestId()));
    expect(ids.size).toBe(1000);
  });
});

describe("seriesKey", () => {
  it("returns the bare name without tags", () => {
    expect(seriesKey("hits")).toBe("hits");
    expect(seriesKey("hits", {})).toBe("hits");
  });

  it("encodes tags sorted by key (order-independent)", () => {
    expect(seriesKey("hits", { route: "_index", method: "GET" })).toBe(
      "hits{method=GET,route=_index}",
    );
    expect(seriesKey("hits", { method: "GET", route: "_index" })).toBe(
      seriesKey("hits", { route: "_index", method: "GET" }),
    );
  });
});

describe("MetricsRegistry", () => {
  it("increments counters, defaulting the step to 1", () => {
    const m = new MetricsRegistry();
    m.incr("requests");
    m.incr("requests");
    m.incr("requests", 5);
    expect(m.snapshot().counters.requests).toBe(7);
  });

  it("keeps tagged series separate", () => {
    const m = new MetricsRegistry();
    m.incr("requests", 1, { route: "a" });
    m.incr("requests", 2, { route: "b" });
    const { counters } = m.snapshot();
    expect(counters["requests{route=a}"]).toBe(1);
    expect(counters["requests{route=b}"]).toBe(2);
  });

  it("ignores non-finite counter steps", () => {
    const m = new MetricsRegistry();
    m.incr("x", Infinity);
    m.incr("x", NaN);
    expect(m.snapshot().counters).toEqual({});
  });

  it("summarizes histogram observations", () => {
    const m = new MetricsRegistry();
    m.observe("dur", 10);
    m.observe("dur", 20);
    m.observe("dur", 30);
    expect(m.snapshot().histograms.dur).toEqual({
      count: 3,
      sum: 60,
      min: 10,
      max: 30,
      avg: 20,
    });
  });

  it("ignores non-finite observations", () => {
    const m = new MetricsRegistry();
    m.observe("dur", NaN);
    m.observe("dur", Infinity);
    expect(m.snapshot().histograms).toEqual({});
  });

  it("returns a plain, empty snapshot for a fresh registry", () => {
    const m = new MetricsRegistry();
    expect(m.snapshot()).toEqual({ counters: {}, histograms: {} });
  });

  it("reset clears all series", () => {
    const m = new MetricsRegistry();
    m.incr("a");
    m.observe("b", 1);
    m.reset();
    expect(m.snapshot()).toEqual({ counters: {}, histograms: {} });
  });
});
