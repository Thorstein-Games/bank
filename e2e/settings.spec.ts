import { expect, openGame, startGame, test } from "./fixtures";

test("settings opens as a dialog with the rules section", async ({ page }) => {
  await openGame(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();

  const rules = dialog.getByTestId("setup-rules");
  await expect(rules.getByRole("heading", { name: "Round Flow" })).toBeHidden();
  await rules.getByText("Rules", { exact: true }).click();
  await expect(rules.getByRole("heading", { name: "Round Flow" })).toBeVisible();
  await expect(rules).toContainText("A 7 in the first three turns adds 70 points");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("settings are reachable during a game", async ({ page }) => {
  await openGame(page);
  await startGame(page, ["Ann", "Ben"]);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog.getByTestId("gameplay-rules")).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(dialog).toBeHidden();
});

test("theme can be forced light or dark and is remembered", async ({ page }) => {
  await openGame(page);
  const html = page.locator("html");
  await expect(html).not.toHaveAttribute("data-theme", /.*/);

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Dark").check();
  await expect(html).toHaveAttribute("data-theme", "dark");
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.getByLabel("Light").check();
  await expect(html).toHaveAttribute("data-theme", "light");
  const lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBackground).not.toBe(darkBackground);

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Light")).toBeChecked();
  await page.getByLabel("System").check();
  await expect(html).not.toHaveAttribute("data-theme", /.*/);
});

test("audio can be muted and the choice is remembered", async ({ page }) => {
  await openGame(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Mute Audio" }).click();
  await expect(page.getByRole("button", { name: "Unmute Audio" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unmute Audio" })).toBeVisible();
});
