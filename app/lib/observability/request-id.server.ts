/**
 * Per-request correlation id. Server-only (`.server.ts`). A request id ties all
 * log lines and metrics for one HTTP request together — pass it into
 * `logger.child({ requestId })` from a Remix loader/action or entry.server.
 *
 * Testability/I/O status: `newRequestId` is pure-ish (delegates to
 * `crypto.randomUUID`, no I/O of our own). `getRequestId` reads a header off an
 * incoming `Request` and is trivially testable with a constructed `Request`.
 *
 * The incoming `x-request-id` header is honored when present and non-empty so an
 * upstream proxy / load balancer can propagate a trace id; otherwise we mint a
 * fresh UUID.
 */

const REQUEST_ID_HEADER = "x-request-id";

/** Generate a fresh RFC-4122 v4 UUID via the Web Crypto API (Node 18+/browsers). */
export function newRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Resolve the request id for an incoming request: the trimmed `x-request-id`
 * header if present and non-empty, otherwise a freshly generated UUID.
 */
export function getRequestId(request: Request): string {
  const header = request.headers.get(REQUEST_ID_HEADER);
  const trimmed = header?.trim();
  return trimmed ? trimmed : newRequestId();
}
