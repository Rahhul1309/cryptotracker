/**
 * Timing helper. Server-only (`.server.ts`). Wraps an async unit of work,
 * measures its wall-clock duration, logs `{ label, ms }`, and returns the
 * result untouched — so adding timing to a loader is a one-line wrap.
 *
 * Testability/I/O status: `formatDuration` is PURE. `time` is injectable: the
 * clock (`now`) and logger are parameters, so a test can feed a fake clock and
 * assert on the measured ms without touching the wall clock. The default clock
 * is `performance.now()` for monotonic, sub-ms resolution.
 */

import type { Logger, LogLevel } from "~/lib/observability/logger.server";
import { logger as defaultLogger } from "~/lib/observability/logger.server";

/** PURE: render a millisecond duration compactly (µs / ms / s as appropriate). */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0ms";
  if (ms < 1) return `${Math.round(ms * 1000)}µs`;
  if (ms < 1000) return `${Math.round(ms * 10) / 10}ms`;
  return `${Math.round(ms / 100) / 10}s`;
}

/** Options for {@link time}; all optional with sensible production defaults. */
export interface TimeOptions {
  /** Logger to emit through; defaults to the shared process logger. */
  log?: Logger;
  /** Level to log at; defaults to "debug" so timing is quiet in production. */
  level?: LogLevel;
  /** Monotonic clock returning ms; injectable for tests. Defaults to perf.now. */
  now?: () => number;
  /** Extra structured fields merged into the timing log line. */
  fields?: Record<string, unknown>;
}

/**
 * Await `fn`, measure how long it took, log one line at the chosen level with
 * `{ label, ms }` (+ any extra `fields`), and return `fn`'s result. The duration
 * is always logged, even if `fn` throws — the error then re-propagates so the
 * caller's error handling is unaffected.
 */
export async function time<T>(
  label: string,
  fn: () => Promise<T> | T,
  options: TimeOptions = {},
): Promise<T> {
  const log = options.log ?? defaultLogger;
  const level: LogLevel = options.level ?? "debug";
  const now = options.now ?? (() => performance.now());
  const extra = options.fields ?? {};

  const start = now();
  try {
    const result = await fn();
    const ms = now() - start;
    log[level](label, { ...extra, label, ms });
    return result;
  } catch (err) {
    const ms = now() - start;
    log.error(label, { ...extra, label, ms, ok: false });
    throw err;
  }
}
