import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config.
 *
 * The app is built and served in MOCK mode (`E2E_MOCK=1`) so tests are
 * deterministic and make NO calls to Coinbase — safe for CI and locked-down
 * machines. `AUTH_DB_PATH` points the user store at a throwaway file.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One worker: the suite shares a single file-backed user/prefs store
  // (.data/*.json), which is intentionally not concurrent-write-safe. Parallel
  // specs race on it (lost signups → stuck on /login), so run serially.
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_MOCK: "1",
      AUTH_SECRET: "e2e-test-secret",
      AUTH_DB_PATH: ".data/e2e-users.json",
      PORT: String(PORT),
      NODE_ENV: "production",
    },
  },
});
