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
import { createUser } from "~/lib/auth/users.server";
import { hasErrors, validateCredentials } from "~/lib/auth/validate";
import { logger } from "~/lib/observability/logger.server";
import { getRequestId } from "~/lib/observability/request-id.server";
import { metrics } from "~/lib/observability/metrics.server";

export const meta: MetaFunction = () => [
  { title: "Create account · CryptoTracker" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  if (await getUser(request)) throw redirect("/");
  return json(null);
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const redirectTo = safeRedirect(form.get("redirectTo"), "/");

  const log = logger.child({ requestId: getRequestId(request), route: "signup" });

  const errors = validateCredentials(email, password);
  if (hasErrors(errors)) return json({ errors }, { status: 400 });

  const result = await createUser(email, password);
  if (!result.ok) {
    metrics.incr("auth.signup.rejected");
    log.info("signup rejected", { reason: "email_taken" });
    return json({ errors: { email: result.error } }, { status: 400 });
  }
  metrics.incr("auth.signup.ok");
  log.info("signup ok", { userId: result.user.id });
  return createUserSession(result.user.id, redirectTo);
}

export default function SignupRoute() {
  const actionData = useActionData<typeof action>();
  const [params] = useSearchParams();
  return (
    <AuthForm
      mode="signup"
      errors={actionData?.errors}
      redirectTo={params.get("redirectTo") ?? undefined}
    />
  );
}
