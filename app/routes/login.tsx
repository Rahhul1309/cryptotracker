import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { useActionData, useSearchParams } from "@remix-run/react";

import { AuthForm } from "~/components/AuthForm";
import {
  createUserSession,
  getUser,
  safeRedirect,
} from "~/lib/auth/session.server";
import { verifyUser } from "~/lib/auth/users.server";
import { hasErrors, validateCredentials } from "~/lib/auth/validate";
import { logger } from "~/lib/observability/logger.server";
import { getRequestId } from "~/lib/observability/request-id.server";
import { metrics } from "~/lib/observability/metrics.server";

export const meta: MetaFunction = () => [{ title: "Sign in · CryptoTracker" }];

export async function loader({ request }: LoaderFunctionArgs) {
  // Already signed in → go to the dashboard.
  if (await getUser(request)) throw redirect("/");
  return json(null);
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const redirectTo = safeRedirect(form.get("redirectTo"), "/");

  const log = logger.child({ requestId: getRequestId(request), route: "login" });

  const errors = validateCredentials(email, password);
  if (hasErrors(errors)) return json({ errors }, { status: 400 });

  const user = await verifyUser(email, password);
  if (!user) {
    // Never log the password or whether the email exists — just the attempt.
    metrics.incr("auth.login.failed");
    log.warn("login failed");
    return json(
      { errors: { form: "Incorrect email or password." } },
      { status: 401 },
    );
  }
  metrics.incr("auth.login.ok");
  log.info("login ok", { userId: user.id });
  return createUserSession(user.id, redirectTo);
}

export default function LoginRoute() {
  const actionData = useActionData<typeof action>();
  const [params] = useSearchParams();
  return (
    <AuthForm
      mode="login"
      errors={actionData?.errors}
      redirectTo={params.get("redirectTo") ?? undefined}
    />
  );
}
