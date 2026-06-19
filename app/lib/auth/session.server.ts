import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { getUserById, type User } from "~/lib/auth/users.server";

/**
 * Cookie-session auth. The session cookie is httpOnly + sameSite=lax and signed
 * with AUTH_SECRET (falls back to a dev secret with a warning). It stores only
 * the user id; the user record is looked up server-side per request.
 */

const secret = process.env.AUTH_SECRET ?? "dev-secret-change-me";
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[auth] AUTH_SECRET is not set — using an insecure dev secret. Set AUTH_SECRET in production.",
  );
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "ct_session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Secure in production — EXCEPT under E2E, where the server runs in
    // production mode but is reached over http://localhost (browsers drop
    // `secure` cookies on http, which would break the test session).
    secure:
      process.env.NODE_ENV === "production" && process.env.E2E_MOCK !== "1",
    secrets: [secret],
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

const USER_ID_KEY = "userId";

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set(USER_ID_KEY, userId);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.commitSession(session) },
  });
}

function getSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

/** Returns the logged-in user, or null. */
export async function getUser(request: Request): Promise<User | null> {
  const session = await getSession(request);
  const userId = session.get(USER_ID_KEY);
  if (typeof userId !== "string") return null;
  return getUserById(userId);
}

/** Require a logged-in user or redirect to /login?redirectTo=… */
export async function requireUser(request: Request): Promise<User> {
  const user = await getUser(request);
  if (!user) {
    const url = new URL(request.url);
    const params = new URLSearchParams({ redirectTo: url.pathname + url.search });
    throw redirect(`/login?${params}`);
  }
  return user;
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: { "Set-Cookie": await storage.destroySession(session) },
  });
}

/** Safe internal redirect target (prevents open-redirect to other origins). */
export function safeRedirect(to: unknown, fallback = "/"): string {
  if (typeof to !== "string" || !to.startsWith("/") || to.startsWith("//")) {
    return fallback;
  }
  return to;
}
