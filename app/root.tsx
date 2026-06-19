import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  useRouteLoaderData,
} from "@remix-run/react";
import { json, type LinksFunction } from "@remix-run/node";

import { themeBootstrapScript } from "~/hooks/useTheme";
import { GlobalProgress } from "~/components/GlobalProgress";
import tailwind from "~/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwind },
  { rel: "preconnect", href: "https://api.coinbase.com" },
];

/**
 * Expose whether we're in E2E/mock mode so the client can disable the live
 * WebSocket (tests run fully offline against mock data — no external calls).
 */
export function loader() {
  return json({ e2e: process.env.E2E_MOCK === "1" });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Runs before paint to apply theme + accent and avoid FOUC. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {data?.e2e ? (
          <script
            dangerouslySetInnerHTML={{ __html: "window.__E2E__=true;" }}
          />
        ) : null}
      </head>
      <body className="relative min-h-screen overflow-x-hidden antialiased">
        <GlobalProgress />
        <div className="relative z-10">{children}</div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * App-level error boundary — catches anything a route boundary doesn't,
 * including 404s. Rendered inside <Layout> automatically by Remix.
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  const title = is404
    ? "Page not found"
    : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : "Something went wrong";
  const detail = is404
    ? "That page doesn’t exist. Head back to your dashboard."
    : "An unexpected error occurred. Please try again.";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div
        className="font-display text-6xl font-bold"
        style={{ color: "var(--accent)" }}
      >
        {is404 ? "404" : "!"}
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-ink-1">{detail}</p>
      <a
        href="/"
        className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-bg-0 transition hover:brightness-110"
        style={{ background: "var(--accent)" }}
      >
        Back to dashboard
      </a>
    </main>
  );
}
