import {
  bank,
  bankTotal,
  expect,
  expectActive,
  expectScore,
  openGame,
  playerCard,
  roll,
  roundLabel,
  scoreboard,
  setDice,
  startGame,
  test,
} from "./fixtures";
import type { Page } from "@playwright/test";

const finalScoreboard = (page: Page) => page.getByRole("list", { name: "Final scoreboard" });

test("plays a full built-in-dice game: early 7, doubles, banking, bust, winner", async ({ page }) => {
  await openGame(page);
  await startGame(page, ["Alice", "Bob", "Cara"], { rounds: 2 });

  // Round 1. Banking is locked for the first three rolls.
  await expectActive(page, "Alice");
  await roll(page, 3, 4, 70); // early 7: +70
  await expect(page.getByRole("img", { name: "Die one: 3" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Die two: 4" })).toBeVisible();
  await expectActive(page, "Bob");
  await expect(playerCard(page, "Alice")).toBeDisabled();
  await roll(page, 2, 2, 74); // early doubles count at face value
  await expectActive(page, "Cara");
  await roll(page, 5, 6, 85);
  await expectActive(page, "Alice");

  // Active player banks: the turn moves straight on.
  await expect(playerCard(page, "Alice")).toBeEnabled();
  await bank(page, "Alice");
  await expectScore(page, "Alice", 85);
  await expectActive(page, "Bob");
  await expect(playerCard(page, "Alice")).toBeDisabled();

  await roll(page, 3, 3, 176); // late doubles: 85 * 2 + 6
  await expectActive(page, "Cara");
  await bank(page, "Bob"); // not his turn, still allowed
  await expectScore(page, "Bob", 176);
  await expectActive(page, "Cara");

  // A 7 after turn three busts: Cara gets nothing, banked players keep theirs.
  await setDice(page, 1, 6);
  await page.getByRole("button", { name: "Roll", exact: true }).click();
  await expect(roundLabel(page)).toHaveText("Round 2 of 2");
  await expect(bankTotal(page)).toHaveText("$0");
  await expect(page.getByText(/^Bust\. Cara rolled 1 and 6/)).toBeAttached();
  await expectScore(page, "Alice", 85);
  await expectScore(page, "Bob", 176);
  await expectScore(page, "Cara", 0);
  await expect(scoreboard(page).getByText("Banked", { exact: true })).toHaveCount(0);

  // Round 2 opens with the player after the one who busted.
  await expectActive(page, "Alice");
  await roll(page, 6, 6, 12);
  await expectActive(page, "Bob");
  await roll(page, 1, 2, 15);
  await expectActive(page, "Cara");
  await roll(page, 4, 5, 24);
  await expectActive(page, "Alice");
  await bank(page, "Cara"); // a non-active player can bank too
  await expectScore(page, "Cara", 24);
  await expectActive(page, "Alice");

  // Final-round bust ends the game.
  await setDice(page, 2, 5);
  await page.getByRole("button", { name: "Roll", exact: true }).click();
  await expect(page.getByRole("heading", { name: "End of Game" })).toBeVisible();

  const standings = finalScoreboard(page).getByRole("listitem");
  await expect(standings).toHaveCount(3);
  await expect(standings.nth(0)).toContainText("#1");
  await expect(standings.nth(0)).toContainText("Bob");
  await expect(standings.nth(0)).toContainText("$176");
  await expect(standings.nth(0)).toContainText("Winner");
  await expect(standings.nth(1)).toContainText("Alice");
  await expect(standings.nth(1)).toContainText("$85");
  await expect(standings.nth(2)).toContainText("Cara");
  await expect(standings.nth(2)).toContainText("$24");
  await expect(finalScoreboard(page).getByText("Winner")).toHaveCount(1);
  await expect(page.getByText("Game complete. Winner: Bob.")).toBeAttached();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __confettiShots?: number }).__confettiShots ?? 0)).toBeGreaterThan(0);
  await expect(page.locator("tg-more-games")).toHaveCount(1);
  await expect(page.locator('tg-ad[format="box"]')).toHaveCount(1);

  // Roll history records every roll of the game.
  await page.getByRole("button", { name: "Roll History" }).click();
  const history = page.getByRole("dialog");
  await expect(history).toBeVisible();
  await page.getByRole("button", { name: "Close roll history" }).click();
  await expect(history).toBeHidden();

  // Play Again keeps the players and settings, resets scores and rounds.
  await page.getByRole("button", { name: "Play Again" }).click();
  await expect(roundLabel(page)).toHaveText("Round 1 of 2");
  for (const name of ["Alice", "Bob", "Cara"]) {
    await expectScore(page, name, 0);
  }
  await expect(bankTotal(page)).toHaveText("$0");
});

test("Change Settings for Next Game returns to a prefilled setup", async ({ page }) => {
  await openGame(page);
  await startGame(page, ["Ann", "Ben"], { rounds: 1, manual: true });
  await page.getByRole("button", { name: "Select sum 4" }).click();
  await expectActive(page, "Ben");
  await page.getByRole("button", { name: "Select sum 4" }).click();
  await expectActive(page, "Ann");
  await page.getByRole("button", { name: "Select sum 4" }).click();
  await expectActive(page, "Ben");
  await page.getByRole("button", { name: "Select sum 7" }).click();
  await expect(page.getByRole("heading", { name: "End of Game" })).toBeVisible();
  // Nobody banked: everyone ties at 0.
  await expect(finalScoreboard(page).getByText("Winner")).toHaveCount(2);

  await page.getByRole("button", { name: "Change Settings for Next Game" }).click();
  await expect(page.getByRole("heading", { name: "Setup" })).toBeVisible();
  await expect(page.getByLabel("Player 1")).toHaveValue("Ann");
  await expect(page.getByLabel("Player 2")).toHaveValue("Ben");
  await expect(page.getByLabel("Manual input")).toBeChecked();
  await expect(page.getByLabel("Custom", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Custom round count")).toHaveValue("1");
  await page.getByLabel("Built-in").check();
  await page.getByLabel("20 rounds").check();
  await page.getByRole("button", { name: "Start Game" }).click();
  await expect(roundLabel(page)).toHaveText("Round 1 of 20");
  await expect(page.getByRole("button", { name: "Roll", exact: true })).toBeVisible();
});

test("manual dice mode: outcome buttons, doubles after turn three, tie result", async ({ page }) => {
  await openGame(page);
  await startGame(page, ["Ann", "Ben"], { rounds: 1, manual: true });

  await expect(page.getByRole("button", { name: "Roll", exact: true })).toHaveCount(0);
  const doubles = page.getByRole("button", { name: "Select doubles" });
  await expect(doubles).toBeDisabled();

  await page.getByRole("button", { name: "Select sum 8" }).click();
  await expect(bankTotal(page)).toHaveText("$8");
  await expectActive(page, "Ben");
  await page.getByRole("button", { name: "Select sum 7" }).click(); // early 7
  await expect(bankTotal(page)).toHaveText("$78");
  await expectActive(page, "Ann");
  await page.getByRole("button", { name: "Select sum 2" }).click(); // early double 1s
  await expect(bankTotal(page)).toHaveText("$80");
  await expectActive(page, "Ben");

  // From turn four: doubles allowed, 2 and 12 (always doubles) disabled.
  await expect(doubles).toBeEnabled();
  await expect(page.getByRole("button", { name: "Select sum 2" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Select sum 12" })).toBeDisabled();

  await bank(page, "Ann");
  await expectScore(page, "Ann", 80);
  await doubles.click(); // 6 + 6: 80 * 2 + 12
  await expect(bankTotal(page)).toHaveText("$172");
  await expectActive(page, "Ben");
  await page.getByRole("button", { name: "Select sum 7" }).click(); // bust, game over
  await expect(page.getByRole("heading", { name: "End of Game" })).toBeVisible();
  await expect(finalScoreboard(page).getByRole("listitem").first()).toContainText("Ann");
  await expect(finalScoreboard(page).getByText("Winner")).toHaveCount(1);
});

test("everyone banking ends the round; equal totals tie", async ({ page }) => {
  await openGame(page);
  await startGame(page, ["Ann", "Ben"], { rounds: 1, manual: true });
  for (const [sum, next] of [[5, "Ben"], [5, "Ann"], [5, "Ben"]] as const) {
    await page.getByRole("button", { name: `Select sum ${sum}` }).click();
    await expectActive(page, next);
  }
  await bank(page, "Ann");
  await playerCard(page, "Ben").click();
  await expect(page.getByRole("heading", { name: "End of Game" })).toBeVisible();
  await expect(finalScoreboard(page).getByText("Winner")).toHaveCount(2);
  await expect(page.getByText("Game complete. Winners: Ann, Ben.")).toBeAttached();
});

test("keyboard: R rolls and B banks the active player", async ({ page }) => {
  await openGame(page);
  await startGame(page, ["Ann", "Ben"], { rounds: 10 });
  await setDice(page, 1, 2);
  for (const [next, total] of [["Ben", 3], ["Ann", 6], ["Ben", 9]] as const) {
    await page.keyboard.press("r");
    await expect(bankTotal(page)).toHaveText(`$${total}`);
    await expectActive(page, next);
  }
  await page.keyboard.press("b");
  await expect(playerCard(page, "Ben")).toContainText("Banked");
  await expectScore(page, "Ben", 9);
  await expectActive(page, "Ann");
});
