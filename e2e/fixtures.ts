import { test as base, expect, type Page } from "@playwright/test";

const TG_BAR_URL = "https://thorsteingames.com/tg-bar.js";
// canvas-confetti is loaded from a CDN on the end screen; this stand-in
// counts calls so tests can check the burst fired.
const CONFETTI_URL = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
const CONFETTI_STUB =
  "window.confetti = function () { window.__confettiShots = (window.__confettiShots || 0) + 1; return null; };";

interface Options {
  /** Body served for the shared tg-bar.js. Empty by default so tests never depend on thorsteingames.com. */
  tgBarScript: string;
  /** Console errors and page errors fail the test unless this is true. */
  allowConsoleErrors: boolean;
}

interface Fixtures {
  consoleErrors: string[];
}

// Deterministic dice: the app rolls with crypto.getRandomValues. While
// window.__bankDice = [a, b] is set, every call yields that pair (the dice
// animation's preview rolls included), so a roll always lands on a + b.
function installDiceStub() {
  const original = Crypto.prototype.getRandomValues;
  Crypto.prototype.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
    const dice = (window as unknown as { __bankDice?: [number, number] }).__bankDice;
    if (dice && array instanceof Uint8Array) {
      for (let index = 0; index < array.length; index += 1) {
        array[index] = dice[index % 2] - 1;
      }
      return array;
    }
    return original.call(this, array as never) as T;
  };
}

export const test = base.extend<Options & Fixtures>({
  tgBarScript: ["", { option: true }],
  allowConsoleErrors: [false, { option: true }],

  consoleErrors: [async ({ page, allowConsoleErrors }, use) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        const { url } = message.location();
        errors.push(`console: ${message.text()}${url ? ` (${url})` : ""}`);
      }
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`);
    });
    await use(errors);
    if (!allowConsoleErrors && errors.length > 0) {
      throw new Error(`Unexpected console/page errors:\n${errors.join("\n")}`);
    }
  }, { auto: true }],

  page: async ({ page, tgBarScript }, use) => {
    await page.addInitScript(installDiceStub);
    // Keep the suite hermetic: stub the shared bar script, refuse anything
    // else that leaves the local server.
    await page.route(
      (url) => url.hostname !== "127.0.0.1",
      (route) => {
        const url = route.request().url();
        if (url === TG_BAR_URL) {
          return route.fulfill({ contentType: "text/javascript", body: tgBarScript });
        }
        if (url === CONFETTI_URL) {
          return route.fulfill({ contentType: "text/javascript", body: CONFETTI_STUB });
        }
        return route.fulfill({ status: 404, body: "" });
      },
    );
    await use(page);
  },
});

export { expect };

/** Loads the game and waits for React to hydrate the setup form. */
export async function openGame(page: Page) {
  await page.goto("/bank/");
  await page.waitForFunction(() => {
    const select = document.querySelector("#player-count");
    return Boolean(select && Object.keys(select).some((key) => key.startsWith("__reactFiber")));
  });
}

export async function setDice(page: Page, dieOne: number, dieTwo: number) {
  await page.evaluate(([a, b]) => {
    (window as unknown as { __bankDice?: [number, number] }).__bankDice = [a, b];
  }, [dieOne, dieTwo] as const);
}

export interface GameOptions {
  rounds?: 10 | 15 | 20 | number;
  manual?: boolean;
}

export async function fillPlayers(page: Page, names: string[]) {
  await page.getByLabel("Player count").selectOption(String(names.length));
  for (const [index, name] of names.entries()) {
    await page.locator(`#player-name-${index + 1}`).fill(name);
  }
}

export async function startGame(page: Page, names: string[], options: GameOptions = {}) {
  await fillPlayers(page, names);
  if (options.manual) {
    await page.getByLabel("Manual input").check();
  }
  const rounds = options.rounds ?? 10;
  if ([10, 15, 20].includes(rounds)) {
    await page.getByLabel(`${rounds} rounds`).check();
  } else {
    await page.getByLabel("Custom", { exact: true }).check();
    await page.getByLabel("Custom round count").fill(String(rounds));
  }
  await page.getByRole("button", { name: "Start Game" }).click();
  await expect(roundLabel(page)).toHaveText(`Round 1 of ${rounds}`);
}

export const scoreboard = (page: Page) => page.getByRole("list", { name: "Scoreboard" });
export const bankTotal = (page: Page) => page.getByTestId("communal-bank-total");
export const roundLabel = (page: Page) => page.getByText(/^Round \d+ of \d+$/);
export const playerCard = (page: Page, name: string) =>
  scoreboard(page).getByRole("listitem").filter({ hasText: name }).getByRole("button");

export async function expectActive(page: Page, name: string) {
  await expect(scoreboard(page).locator('li[aria-current="true"]')).toContainText(name);
}

export async function expectScore(page: Page, name: string, score: number) {
  await expect(playerCard(page, name).getByText(`$${score}`, { exact: true })).toBeVisible();
}

/** Built-in dice: rolls a fixed pair and waits for the bank to show the result. */
export async function roll(page: Page, dieOne: number, dieTwo: number, expectedBank: number) {
  await setDice(page, dieOne, dieTwo);
  await page.getByRole("button", { name: "Roll", exact: true }).click();
  await expect(bankTotal(page)).toHaveText(`$${expectedBank}`);
}

export async function bank(page: Page, name: string) {
  await playerCard(page, name).click();
  await expect(playerCard(page, name)).toContainText("Banked");
}
