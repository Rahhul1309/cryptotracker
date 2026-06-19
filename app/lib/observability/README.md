# Observability

Server-only logging, request correlation, timing, and lightweight metrics for
CryptoTracker. Everything here lives under `app/lib/observability/` and the
`.server.ts` suffix keeps it out of the client bundle. The pure cores are unit
tested in `app/tests/observability.test.ts`.

## Modules

| File | Responsibility |
|---|---|
| `logger.server.ts` | Structured, leveled logger. JSON in production, colorized pretty lines in dev. Pure `buildLogRecord` core + thin write wrapper. |
| `request-id.server.ts` | `getRequestId(request)` reads `x-request-id` or mints a UUID via `newRequestId()`. |
| `timing.server.ts` | `time(label, fn, opts?)` measures and logs an async unit of work; pure `formatDuration(ms)`. |
| `metrics.server.ts` | In-memory counter/histogram registry (`incr`/`observe`/`snapshot`). A stand-in for a real metrics backend. |

## Env vars

| Var | Values | Default | Effect |
|---|---|---|---|
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` | `info` (`warn` when `NODE_ENV==="test"`) | Minimum level emitted. |
| `LOG_PRETTY` | `1` | unset | `1` forces colorized output. Otherwise pretty is used whenever `NODE_ENV !== "production"`; production defaults to single-line JSON. |

## JSON log shape

One JSON object per line. `debug`/`info`/`warn` go to stdout; `error` to stderr.

```json
{
  "ts": "2026-06-19T12:34:56.789Z",
  "level": "info",
  "msg": "loader complete",
  "requestId": "f1e2d3c4-...",
  "fields": { "route": "_index", "rates": 12 }
}
```

- `ts` — ISO-8601 timestamp.
- `level` — one of `debug|info|warn|error`.
- `msg` — the human message.
- `requestId` — present only when a `requestId` binding/field was supplied
  (lifted out of `fields` into its own top-level slot).
- `fields` — merged logger bindings + call-site fields (call-site wins on key
  conflicts), always present (may be `{}`).

## How to integrate (for the route/entry integrator)

These modules do **not** edit your routes — wire them in yourself:

1. **Per request, derive an id and a child logger** (in a loader/action or in
   `entry.server.tsx`):

   ```ts
   import { logger } from "~/lib/observability/logger.server";
   import { getRequestId } from "~/lib/observability/request-id.server";

   export async function loader({ request }: LoaderFunctionArgs) {
     const requestId = getRequestId(request);
     const log = logger.child({ requestId });
     log.info("loader start", { route: "_index" });
     // ...
   }
   ```

2. **Wrap slow work with `time`** so duration is logged automatically:

   ```ts
   import { time } from "~/lib/observability/timing.server";

   const data = await time("fetchDashboard", () => fetchDashboard(currencies), {
     log,
     fields: { route: "_index" },
   });
   ```

   `time` logs at `debug` by default (quiet in production unless `LOG_LEVEL=debug`)
   and always logs even if `fn` throws (then re-throws).

3. **Count/observe domain events** with the metrics registry:

   ```ts
   import { metrics } from "~/lib/observability/metrics.server";

   metrics.incr("loader.requests", 1, { route: "_index" });
   metrics.observe("loader.duration_ms", ms, { route: "_index" });
   // Expose a debug endpoint or periodic flush via metrics.snapshot().
   ```

4. **Optionally propagate the id back** by setting an `x-request-id` response
   header in the route/entry so clients and downstream logs can correlate.

> The metrics registry is process-local and resets on restart — it is a
> stand-in, not a production backend. Swap `snapshot()` for a real exporter
> (CloudWatch/Prometheus/StatsD) when one is introduced.
