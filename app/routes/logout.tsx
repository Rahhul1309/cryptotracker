import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { logout } from "~/lib/auth/session.server";

/** Logout is POST-only (a form action) to avoid CSRF via GET prefetch. */
export async function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

export async function loader() {
  return redirect("/");
}
