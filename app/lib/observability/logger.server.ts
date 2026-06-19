/**
 * Structured server logger. Server-only (`.server.ts`): never imported into the
 * client bundle. Emits one JSON object per line to stdout (debug/info/warn) or
 * stderr (error), or a colorized human-readable line in non-production.
 *
 * Testability/I/O status: the record-building core (`buildLogRecord`) and level
 * comparison (`shouldLog`) are PURE and exported for unit testing. The only I/O
 * is the thin `write` wrapper that serializes a record and pushes it to a
 * stream — so tests assert on record shape, not captured stdout.
 *
 * Env vars:
 *  - LOG_LEVEL: "debug" | "info" | "warn" | "error" (default "info"; "warn" when
 *    NODE_ENV === "test" to keep test output quiet).
 *  - LOG_PRETTY: "1" forces colorized output; otherwise pretty is used whenever
 *    NODE_ENV !== "production". Production defaults to single-line JSON.
 *
 * Dependency-free: ANSI colors are hand-written, no logging library.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Arbitrary structured context attached to a log line. JSON-serializable. */
export type LogFields = Record<string, unknown>;

/** The shape emitted (as JSON) or rendered (pretty) for every log line. */
export interface LogRecord {
  /** ISO-8601 timestamp. */
  ts: string;
  level: LogLevel;
  msg: string;
  /** Pulled out of fields/bindings for first-class access; optional. */
  requestId?: string;
  /** Merged bindings + call-site fields, minus `requestId`. Always present. */
  fields: LogFields;
}

/** Numeric rank so levels can be compared; higher = more severe. */
const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const VALID_LEVELS: ReadonlySet<string> = new Set<LogLevel>([
  "debug",
  "info",
  "warn",
  "error",
]);

/**
 * PURE: build the record for a log call by merging logger `bindings` (e.g. a
 * child's `requestId`) under call-site `fields` (call-site wins on conflict),
 * lifting `requestId` to a top-level field. `now` is injected for determinism.
 */
export function buildLogRecord(
  level: LogLevel,
  msg: string,
  fields: LogFields | undefined,
  bindings: LogFields | undefined,
  now: Date,
): LogRecord {
  const merged: LogFields = { ...(bindings ?? {}), ...(fields ?? {}) };
  const requestId =
    typeof merged.requestId === "string" ? merged.requestId : undefined;
  // Don't duplicate requestId inside `fields` — it has a first-class slot.
  if ("requestId" in merged) delete merged.requestId;

  const record: LogRecord = {
    ts: now.toISOString(),
    level,
    msg,
    fields: merged,
  };
  if (requestId !== undefined) record.requestId = requestId;
  return record;
}

/** PURE: should a message at `level` be emitted given the configured `min`? */
export function shouldLog(level: LogLevel, min: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}

/**
 * PURE: resolve the minimum level from a raw env value + NODE_ENV. Invalid or
 * absent LOG_LEVEL → "warn" under test, "info" otherwise.
 */
export function resolveLevel(
  rawLevel: string | undefined,
  nodeEnv: string | undefined,
): LogLevel {
  if (rawLevel !== undefined && VALID_LEVELS.has(rawLevel)) {
    return rawLevel as LogLevel;
  }
  return nodeEnv === "test" ? "warn" : "info";
}

/** PURE: decide whether to render colorized pretty output vs JSON. */
export function usePretty(
  logPretty: string | undefined,
  nodeEnv: string | undefined,
): boolean {
  if (logPretty === "1") return true;
  return nodeEnv !== "production";
}

// Minimal hand-written ANSI palette — no dependency.
const ANSI = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  gray: "\u001b[90m",
  red: "\u001b[31m",
  yellow: "\u001b[33m",
  cyan: "\u001b[36m",
  green: "\u001b[32m",
} as const;

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: ANSI.gray,
  info: ANSI.green,
  warn: ANSI.yellow,
  error: ANSI.red,
};

/** PURE: serialize a record to a single line of JSON. */
export function formatJson(record: LogRecord): string {
  return JSON.stringify(record);
}

/** PURE: render a record as a human-readable, colorized single line. */
export function formatPretty(record: LogRecord): string {
  const color = LEVEL_COLOR[record.level];
  const level = `${color}${record.level.toUpperCase().padEnd(5)}${ANSI.reset}`;
  const time = `${ANSI.dim}${record.ts}${ANSI.reset}`;
  const rid = record.requestId
    ? ` ${ANSI.cyan}[${record.requestId}]${ANSI.reset}`
    : "";
  const hasFields = Object.keys(record.fields).length > 0;
  const fields = hasFields
    ? ` ${ANSI.dim}${JSON.stringify(record.fields)}${ANSI.reset}`
    : "";
  return `${time} ${level}${rid} ${record.msg}${fields}`;
}

/** A logger exposes the four level methods plus `child` for pre-bound fields. */
export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  /** Return a new logger with `bindings` merged into every record. */
  child(bindings: LogFields): Logger;
}

/** Config the factory needs; defaults read process env, overridable in tests. */
export interface LoggerConfig {
  minLevel: LogLevel;
  pretty: boolean;
  /** Injectable clock for deterministic tests; defaults to `() => new Date()`. */
  now: () => Date;
  /** Injectable sinks; default to process.stdout/stderr writes. */
  writeOut: (line: string) => void;
  writeErr: (line: string) => void;
}

function defaultConfig(): LoggerConfig {
  const env: Partial<Record<string, string>> =
    typeof process !== "undefined" ? process.env : {};
  return {
    minLevel: resolveLevel(env.LOG_LEVEL, env.NODE_ENV),
    pretty: usePretty(env.LOG_PRETTY, env.NODE_ENV),
    now: () => new Date(),
    writeOut: (line) => process.stdout.write(line + "\n"),
    writeErr: (line) => process.stderr.write(line + "\n"),
  };
}

/**
 * Build a logger over the given config and accumulated `bindings`. Errors go to
 * stderr; everything else to stdout. `child` returns a logger sharing the same
 * config with deeper bindings.
 */
export function createLogger(
  config: LoggerConfig,
  bindings: LogFields = {},
): Logger {
  const emit = (level: LogLevel, msg: string, fields?: LogFields): void => {
    if (!shouldLog(level, config.minLevel)) return;
    const record = buildLogRecord(level, msg, fields, bindings, config.now());
    const line = config.pretty ? formatPretty(record) : formatJson(record);
    if (level === "error") config.writeErr(line);
    else config.writeOut(line);
  };

  return {
    debug: (msg, fields) => emit("debug", msg, fields),
    info: (msg, fields) => emit("info", msg, fields),
    warn: (msg, fields) => emit("warn", msg, fields),
    error: (msg, fields) => emit("error", msg, fields),
    child: (childBindings) =>
      createLogger(config, { ...bindings, ...childBindings }),
  };
}

/** The shared, process-configured logger. Use `.child({ requestId })` per request. */
export const logger: Logger = createLogger(defaultConfig());
