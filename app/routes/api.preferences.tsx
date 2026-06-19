import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";

import { requireUser } from "~/lib/auth/session.server";
import { getPrefs, savePrefs } from "~/lib/prefs-store.server";

/**
 * Resource route for SERVER-SIDE PER-USER PREFERENCES.
 *
 * This is the API contract the client (`useSettings`) uses to hydrate prefs
 * from the authenticated account and to persist changes (debounced). It is a
 * resource route: no default export, no UI. Both methods require a logged-in
 * user (`requireUser` redirects to /login otherwise).
 *
 * ── Contract ─────────────────────────────────────────────────────────────────
 *
 *   GET  /api/preferences
 *     → 200 { prefs: Settings }            current user's saved settings
 *                                          (DEFAULT_SETTINGS if none yet)
 *     → 302 → /login?redirectTo=…          if not authenticated
 *
 *   POST /api/preferences
 *     Body — EITHER:
 *       • JSON:  Content-Type: application/json, body = { "prefs": Settings }
 *       • Form:  Content-Type: application/x-www-form-urlencoded (or multipart),
 *                field `prefs` = a JSON string of the Settings object
 *     → 200 { prefs: Settings }            the *validated, saved* settings
 *                                          (mergeSettings sanitizes: unknown keys
 *                                           dropped, invalid enums/numbers fixed)
 *     → 400 { error: string }              malformed/unparseable body
 *     → 302 → /login?redirectTo=…          if not authenticated
 *
 * The returned `prefs` is always the canonical normalized value — clients
 * should adopt it (it may differ from what they sent if anything was invalid).
 * `Settings` is exported from `~/lib/settings`.
 */

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  return json({ prefs: await getPrefs(user.id) });
}

/** Extract the untrusted prefs payload from a JSON or form-encoded request. */
async function readPrefsPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    // request.json() throws on malformed JSON — caller turns that into a 400.
    const body = (await request.json()) as unknown;
    if (typeof body === "object" && body !== null && "prefs" in body) {
      return (body as { prefs: unknown }).prefs;
    }
    // Allow posting the Settings object directly as the JSON body too.
    return body;
  }

  // Form submission: a `prefs` field holding a JSON string.
  const form = await request.formData();
  const raw = form.get("prefs");
  if (typeof raw !== "string") {
    throw new SyntaxError("Missing `prefs` form field.");
  }
  return JSON.parse(raw) as unknown;
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);

  if (request.method.toUpperCase() !== "POST") {
    return json({ error: "Method not allowed." }, { status: 405 });
  }

  let payload: unknown;
  try {
    payload = await readPrefsPayload(request);
  } catch {
    // Bad JSON, missing field, or unreadable body — never trust it, never 500.
    return json({ error: "Invalid preferences payload." }, { status: 400 });
  }

  // savePrefs runs the payload through mergeSettings, so anything that parsed
  // is sanitized into a safe Settings before persisting.
  const prefs = await savePrefs(user.id, payload);
  return json({ prefs });
}
