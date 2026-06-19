import { Form } from "@remix-run/react";
import { SETTINGS_STORAGE_KEY } from "~/lib/settings";

/**
 * Shows the signed-in user's email and a logout button (POSTs to /logout).
 *
 * On sign-out we also clear the device-local settings copy so the NEXT user on
 * this browser doesn't briefly see the previous user's theme/watchlist before
 * their own server prefs load. Per-user state lives server-side keyed by userId;
 * localStorage is only a fast-path cache for the current user.
 */
export function UserMenu({ email }: { email: string }) {
  const initial = email.trim().charAt(0).toUpperCase() || "?";
  const clearLocalPrefs = () => {
    try {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-bg-0"
        style={{ background: "var(--accent)" }}
        title={email}
        aria-hidden="true"
      >
        {initial}
      </div>
      <span className="hidden max-w-[12rem] truncate text-sm text-ink-1 sm:inline">
        {email}
      </span>
      <Form method="post" action="/logout" onSubmit={clearLocalPrefs}>
        <button
          type="submit"
          className="rounded-lg border border-line bg-bg-1 px-2.5 py-1.5 text-xs font-medium text-ink-1 transition hover:border-down/50 hover:text-down"
        >
          Sign out
        </button>
      </Form>
    </div>
  );
}
