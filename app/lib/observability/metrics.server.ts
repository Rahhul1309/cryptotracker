/**
 * Tiny in-memory metrics registry. Server-only (`.server.ts`).
 *
 * This is a LIGHTWEIGHT STAND-IN for a real metrics backend (CloudWatch,
 * Prometheus, StatsD, etc.), NOT a production telemetry system. It holds
 * counters and histograms in a process-local `Map`, so values reset on restart
 * and are not shared across instances. Use it to instrument code now and swap
 * `snapshot()` for a real exporter later.
 *
 * Testability/I/O status: PURE data structure — no timers, no network, no
 * stdout. Everything is deterministic given the calls made, so it's directly
 * unit-testable.
 */

/** Tag set for a metric. Keys/values are stringified into a stable series key. */
export type MetricTags = Record<string, string | number | boolean>;

/** Summary statistics for one observed histogram series. */
export interface HistogramSummary {
  count: number;
  sum: number;
  min: number;
  max: number;
  /** Arithmetic mean; 0 when `count === 0`. */
  avg: number;
}

/** Plain, JSON-serializable view of the registry at a point in time. */
export interface MetricsSnapshot {
  counters: Record<string, number>;
  histograms: Record<string, HistogramSummary>;
}

/**
 * PURE: build the stable series key for a metric name + tags. Tags are sorted by
 * key so `{a,b}` and `{b,a}` collapse to the same series. Encoded as
 * `name{k1=v1,k2=v2}`; no tags → just `name`.
 */
export function seriesKey(name: string, tags?: MetricTags): string {
  if (!tags) return name;
  const entries = Object.entries(tags);
  if (entries.length === 0) return name;
  const encoded = entries
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(",");
  return `${name}{${encoded}}`;
}

export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  /** Increment a counter series by `by` (default 1). Ignores non-finite `by`. */
  incr(name: string, by = 1, tags?: MetricTags): void {
    if (!Number.isFinite(by)) return;
    const key = seriesKey(name, tags);
    this.counters.set(key, (this.counters.get(key) ?? 0) + by);
  }

  /** Record one observation into a histogram series. Ignores non-finite values. */
  observe(name: string, value: number, tags?: MetricTags): void {
    if (!Number.isFinite(value)) return;
    const key = seriesKey(name, tags);
    const series = this.histograms.get(key);
    if (series) series.push(value);
    else this.histograms.set(key, [value]);
  }

  /** Return a plain object snapshot (counters + summarized histograms). */
  snapshot(): MetricsSnapshot {
    const counters: Record<string, number> = {};
    for (const [key, value] of this.counters) counters[key] = value;

    const histograms: Record<string, HistogramSummary> = {};
    for (const [key, values] of this.histograms) {
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      for (const v of values) {
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const count = values.length;
      histograms[key] = {
        count,
        sum,
        min: count > 0 ? min : 0,
        max: count > 0 ? max : 0,
        avg: count > 0 ? sum / count : 0,
      };
    }

    return { counters, histograms };
  }

  /** Clear all series. Handy for tests and per-request scoping if ever needed. */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}

/** Shared process-wide registry. Construct your own `MetricsRegistry` in tests. */
export const metrics = new MetricsRegistry();
