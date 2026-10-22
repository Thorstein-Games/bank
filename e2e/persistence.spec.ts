import {
  bank,
  bankTotal,
  expect,
  expectActive,
  expectScore,
  openGame,
  roll,
  roundLabel,
  setDice,
  startGame,
  test,
} from "./fixtures";
import type { Page } from "@playwright/test";

const SAVE_KEY = "bank-game:v1:saved-run";

async function reload(page: Page) {
  await page.reload();
  await expect(page.getByText("Saved game found.")).toBeVisible();
}

async function playIntoRoundTwo(page: Page) {
  await openGame(page);
  await startGame(page, ["Ann", "Ben", "Cat"], { rounds: 5 });
  await roll(page, 2, 3, 5);
  await expectActive(page, "Ben");
  await roll(page, 2, 3, 10);
  await expectActive(page, "Cat");
  await roll(page, 2, 3, 15);
  await expectActive(page, "Ann");
  await bank(page, "Ben");
  await setDice(page, 3, 4);
  await page.getByRole("button", { name: "Roll", exact: true }).click(); // Ann busts
  await expect(roundLabel(page)).toHaveText("Round 2 of 5");
  await expectActive(page, "Ben");
  await roll(page, 4, 4, 8);
  await expectActive(page, "Cat");
}

test("reloading mid-game offers Resume and restores the exact state", async ({ page }) => {
  await playIntoRoundTwo(page);
  await reload(page);
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();

  await page.getByRole("button", { name: "Resume Game" }).click();
  await expect(roundLabel(page)).toHaveText("Round 2 of 5");
  await expect(bankTotal(page)).toHaveText("$8");
  await expectActive(page, "Cat");
  await expectScore(page, "Ben", 15);
  await expectScore(page, "Ann", 0);
  await expect(page.getByRole("img", { name: "Die one: 4" })).toBeVisible();

  // Play continues from there.
  await roll(page, 1, 2, 11);
  await expectActive(page, "Ann");
});

test("New Game from the resume prompt discards the save", async ({ page }) => {
  await playIntoRoundTwo(page);
  await reload(page);
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByLabel("Player 1")).toHaveValue("");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();

  await page.reload();
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  await expect(page.getByText("Saved game found.")).toHaveCount(0);
});

test("a reload during the dice animation keeps the committed roll", async ({ page }) => {
  await openGame(page);
  await startGame(page, ["Ann", "Ben"], { rounds: 3 });
  await setDice(page, 5, 6);
  await page.getByRole("button", { name: "Roll", exact: true }).click();
  // The roll is saved as pending before the animation resolves.
  await expect
    .poll(() =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null")?.pendingRoll, SAVE_KEY),
    )
    .toEqual({ dieOne: 5, dieTwo: 6 });
  await page.evaluate(() => {
    delete (window as unknown as { __bankDice?: unknown }).__bankDice;
  });
  await reload(page);
  await page.getByRole("button", { name: "Resume Game" }).click();
  await expect(bankTotal(page)).toHaveText("$11");
  await expect(page.getByRole("img", { name: "Die one: 5" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Die two: 6" })).toBeVisible();
  await expectActive(page, "Ben");
});

test("a corrupt save is ignored", async ({ page }) => {
  await openGame(page);
  await page.evaluate((key) => localStorage.setItem(key, "{not json"), SAVE_KEY);
  await page.reload();
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  await expect(page.getByText("Saved game found.")).toHaveCount(0);
});

test("Reset Saved Game in settings clears the save after confirming", async ({ page }) => {
  await openGame(page);
  await startGame(page, ["Ann", "Ben"], { rounds: 3 });
  await roll(page, 1, 2, 3);
  await reload(page);

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("Reset saved game data?");
    void dialog.accept();
  });
  await page.getByRole("button", { name: "Reset Saved Game" }).click();
  await expect(page.getByText("Saved game found.")).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
});
