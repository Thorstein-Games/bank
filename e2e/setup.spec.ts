import { expect, fillPlayers, openGame, roundLabel, scoreboard, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await openGame(page);
});

test("requires names before starting", async ({ page }) => {
  await expect(page.getByLabel("Player 1")).toHaveValue("");
  await expect(page.getByText("Name is required.")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Start Game" })).toBeDisabled();

  await page.getByLabel("Player 1").fill("Alice");
  await expect(page.getByText("Name is required.")).toHaveCount(1);
  await page.getByLabel("Player 2").fill("   ");
  await expect(page.getByText("Name is required.")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Start Game" })).toBeDisabled();

  await page.getByLabel("Player 2").fill("Bob");
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start Game" })).toBeEnabled();
});

test("rejects duplicate names regardless of case and spacing", async ({ page }) => {
  await fillPlayers(page, ["Alice", " alice "]);
  await expect(page.getByText("Name must be unique.")).toHaveCount(2);
  await expect(page.getByLabel("Player 1")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Start Game" })).toBeDisabled();

  // Renaming fixes it.
  await page.getByLabel("Player 2").fill("Alicia");
  await expect(page.getByText("Name must be unique.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start Game" })).toBeEnabled();
});

test("adds and removes players with the player count", async ({ page }) => {
  const nameInputs = page.locator('input[id^="player-name-"]');
  await expect(nameInputs).toHaveCount(2);
  const counts = await page.getByLabel("Player count").locator("option").allTextContents();
  expect(counts).toEqual(Array.from({ length: 15 }, (_, index) => String(index + 2)));

  await fillPlayers(page, ["Alice", "Bob", "Cara", "Dan"]);
  await expect(nameInputs).toHaveCount(4);

  await page.getByLabel("Player count").selectOption("16");
  await expect(nameInputs).toHaveCount(16);
  await expect(page.getByLabel("Player 4", { exact: true })).toHaveValue("Dan");
  await expect(page.getByRole("button", { name: "Start Game" })).toBeDisabled();

  await page.getByLabel("Player count").selectOption("3");
  await expect(nameInputs).toHaveCount(3);
  await expect(page.getByLabel("Player 3")).toHaveValue("Cara");
  await expect(page.getByRole("button", { name: "Start Game" })).toBeEnabled();
});

test("validates a custom round count", async ({ page }) => {
  await fillPlayers(page, ["Alice", "Bob"]);
  const custom = page.getByLabel("Custom round count");
  await expect(custom).toBeDisabled();

  await page.getByLabel("Custom", { exact: true }).check();
  await expect(custom).toBeEnabled();
  const error = page.getByText("Custom rounds must be a whole number greater than 0.");
  await expect(error).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Game" })).toBeDisabled();

  for (const bad of ["0", "-2", "2.5"]) {
    await custom.fill(bad);
    await expect(error).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Game" })).toBeDisabled();
  }

  await custom.fill("3");
  await expect(error).toBeHidden();
  await page.getByRole("button", { name: "Start Game" }).click();
  await expect(roundLabel(page)).toHaveText("Round 1 of 3");
});

test("starts a game with the names in order and locks the player list", async ({ page }) => {
  await fillPlayers(page, ["  Alice ", "Bob", "Cara"]);
  await page.getByLabel("15 rounds").check();
  await page.getByRole("button", { name: "Start Game" }).click();

  await expect(roundLabel(page)).toHaveText("Round 1 of 15");
  await expect(page.getByRole("heading", { name: "Setup" })).toBeHidden();
  await expect(page.getByLabel("Player count")).toBeHidden();
  await expect(scoreboard(page).getByRole("listitem")).toHaveCount(3);
  await expect(scoreboard(page).locator('li[aria-current="true"]')).toContainText("Alice");
  await expect(page.getByTestId("communal-bank-total")).toHaveText("$0");
  await expect(page.getByRole("button", { name: "Roll", exact: true })).toBeEnabled();
});
