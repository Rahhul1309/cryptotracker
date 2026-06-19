import { test, expect } from "@playwright/test";
import { signup } from "./helpers";

test.describe("dashboard features", () => {
  test.beforeEach(async ({ page }) => {
    await signup(page);
  });

  test("filter narrows the visible coins by name", async ({ page }) => {
    const filter = page.getByPlaceholder(/search assets/i);
    await filter.fill("ethereum");
    await expect(page.getByText("Ethereum")).toBeVisible();
    await expect(page.getByText("Solana")).toHaveCount(0);
  });

  test("starring a coin populates the watchlist view", async ({ page }) => {
    // Star the first card (★ = watchlist favorite).
    await page
      .getByRole("button", { name: /add .* to watchlist/i })
      .first()
      .click();

    // The watchlist tab shows a count badge and the coin appears there.
    await page.getByRole("button", { name: /^watchlist/i }).click();
    await expect(
      page.getByRole("button", { name: /remove .* from watchlist/i }).first(),
    ).toBeVisible();
  });

  test("empty watchlist shows the empty state", async ({ page }) => {
    await page.getByRole("button", { name: /^watchlist/i }).click();
    await expect(page.getByText(/your watchlist is empty/i)).toBeVisible();
  });

  test("a coin can be removed and stays gone (reactive, no refresh)", async ({
    page,
  }) => {
    // Solana is a default coin; removing it hides it immediately (no refresh).
    const solCard = page.getByTestId("crypto-card-SOL");
    await expect(solCard).toBeVisible();
    await page.getByRole("button", { name: /stop tracking solana/i }).click();
    await expect(page.getByTestId("crypto-card-SOL")).toHaveCount(0);
    // Still gone after a reload (persisted to server prefs).
    await page.reload();
    await expect(page.getByTestId("crypto-card-SOL")).toHaveCount(0);
  });

  test("universal search adds a new coin to tracking", async ({ page }) => {
    const search = page.getByPlaceholder(/search any coin/i);
    await search.click();
    await search.fill("uni");
    // Catalog result appears; click to track it.
    const result = page.getByRole("button", { name: /track/i }).first();
    await expect(result).toBeVisible();
    await result.click();
    // It now shows as tracked in the search popover.
    await expect(
      page.getByRole("button", { name: /tracking/i }).first(),
    ).toBeVisible();
  });

  test("an added coin persists across a reload (server prefs)", async ({
    page,
  }) => {
    const search = page.getByPlaceholder(/search any coin/i);
    await search.click();
    await search.fill("uni");
    await page.locator(".panel button", { hasText: /track/i }).first().click();
    // The added coin's card appears on the dashboard.
    await expect(page.getByTestId("crypto-card-UNI")).toBeVisible();

    // After a reload it must still be there — the add was flushed to server
    // prefs immediately, not left to the save debounce (which a reload beats).
    await page.reload();
    await expect(page.getByTestId("crypto-card-UNI")).toBeVisible();
  });

  test("re-adding a previously deleted coin brings it back", async ({
    page,
  }) => {
    // Delete a default coin…
    await expect(page.getByTestId("crypto-card-SOL")).toBeVisible();
    await page.getByRole("button", { name: /stop tracking solana/i }).click();
    await expect(page.getByTestId("crypto-card-SOL")).toHaveCount(0);

    // …then re-add it via search. It must reappear — the add un-hides it
    // (before the fix it stayed hidden while search read "✓ Tracking").
    const search = page.getByPlaceholder(/search any coin/i);
    await search.click();
    await search.fill("solana");
    await page.locator(".panel button", { hasText: /track/i }).first().click();
    await expect(page.getByTestId("crypto-card-SOL")).toBeVisible();
  });

  test("opening a coin shows the detail modal", async ({ page }) => {
    // Click the BTC card by its stable test id (avoids "Bitcoin" vs
    // "Bitcoin Cash" text ambiguity).
    await page.getByTestId("crypto-card-BTC").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/24h high/i)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("changing theme persists across reload", async ({ page }) => {
    await page.getByRole("button", { name: /preferences/i }).click();
    const ferrari = page.getByRole("button", { name: "Ferrari theme" });
    await expect(ferrari).toBeVisible();
    await ferrari.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "ferrari");

    await page.reload();
    // Pre-paint bootstrap restores the saved theme with no flash.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "ferrari");
  });

  test("dark/light mode toggles and persists", async ({ page }) => {
    const html = page.locator("html");
    const initial = await html.getAttribute("data-mode");
    await page.getByRole("button", { name: /switch to .* mode/i }).click();
    await expect(html).not.toHaveAttribute("data-mode", initial ?? "dark");
    await page.reload();
    // The toggled mode survives reload.
    await expect(html).not.toHaveAttribute("data-mode", initial ?? "dark");
  });

  test("live toggle flips its switch state", async ({ page }) => {
    const liveSwitch = page.getByRole("switch", { name: /live/i });
    await expect(liveSwitch).toHaveAttribute("aria-checked", "true");
    await liveSwitch.click();
    await expect(liveSwitch).toHaveAttribute("aria-checked", "false");
  });
});
