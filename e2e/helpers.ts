import { type Page, expect } from "@playwright/test";

/** Create a unique email per test run so the file-backed store stays clean. */
export function uniqueEmail(prefix = "user"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}@example.com`;
}

/** Sign up a fresh user and land on the dashboard. */
export async function signup(page: Page, email = uniqueEmail()) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret123");
  await page.getByRole("button", { name: /create account/i }).click();
  // Landed on the dashboard: wait for the URL to be "/" and a stable dashboard
  // control (the Live switch) to render. (The brand wordmark is not a heading.)
  await page.waitForURL("/");
  await expect(page.getByRole("switch", { name: /live/i })).toBeVisible();
  return email;
}
