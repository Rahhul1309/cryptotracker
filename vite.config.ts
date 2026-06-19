/// <reference types="vitest" />
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    // Remix's own plugin breaks Vitest, so it is disabled in the test env.
    !process.env.VITEST &&
      remix({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_singleFetch: true,
          v3_lazyRouteDiscovery: true,
        },
      }),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./app/tests/setup.ts"],
    include: ["./app/**/*.test.{ts,tsx}"],
  },
});
