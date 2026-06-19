import { Form, Link, useNavigation } from "@remix-run/react";
import { LogoMark } from "~/components/Logo";

interface AuthFormProps {
  mode: "login" | "signup";
  /** Field + form errors from the action. */
  errors?: { email?: string; password?: string; form?: string };
  defaultEmail?: string;
  redirectTo?: string;
}

/**
 * Shared login/signup form. Progressive-enhancement friendly (a real <Form>
 * posting to the route action), with disabled/pending state during submit and
 * inline field errors.
 */
export function AuthForm({
  mode,
  errors,
  defaultEmail = "",
  redirectTo,
}: AuthFormProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const isLogin = mode === "login";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <LogoMark size={56} />
        <h1 className="mt-4 font-display text-2xl font-bold">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-ink-1">
          {isLogin
            ? "Sign in to your CryptoTracker dashboard."
            : "Track crypto markets, your way."}
        </p>
      </div>

      <Form method="post" className="panel flex flex-col gap-4 p-6">
        {redirectTo ? (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        ) : null}

        {errors?.form ? (
          <div
            role="alert"
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--down) 45%, var(--line))",
              background: "color-mix(in srgb, var(--down) 12%, transparent)",
              color: "var(--down)",
            }}
          >
            {errors.form}
          </div>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-1">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={defaultEmail}
            aria-invalid={errors?.email ? true : undefined}
            className="rounded-xl border border-line bg-bg-2 px-3 py-2.5 text-sm outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
          />
          {errors?.email ? (
            <span className="text-xs text-down">{errors.email}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-1">Password</span>
          <input
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={8}
            aria-invalid={errors?.password ? true : undefined}
            className="rounded-xl border border-line bg-bg-2 px-3 py-2.5 text-sm outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
          />
          {errors?.password ? (
            <span className="text-xs text-down">{errors.password}</span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={busy}
          className="mt-1 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-bg-0 shadow transition hover:brightness-110 disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {busy
            ? isLogin
              ? "Signing in…"
              : "Creating account…"
            : isLogin
              ? "Sign in"
              : "Create account"}
        </button>
      </Form>

      <p className="mt-5 text-center text-sm text-ink-1">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link
          to={isLogin ? "/signup" : "/login"}
          className="font-medium"
          style={{ color: "var(--accent)" }}
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
