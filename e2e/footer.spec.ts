import { readFileSync } from "node:fs";
import { expect, openGame, test } from "./fixtures";

// The footer links come from the shared tg-bar.js on thorsteingames.com (see
// CLAUDE.md). This test runs it for real: from TG_BAR_JS_FILE when set (e.g.
// ../thorstein-games-website/public/tg-bar.js), otherwise the live script. If
// neither is available it is skipped, so an outage there can't block a deploy.
const TG_BAR_URL = "https://thorsteingames.com/tg-bar.js";

test.use({ allowConsoleErrors: true }); // the stubbed network 404s the bar's icons

test("shared footer links to Home, the other games, Contact, Privacy and More Games", async ({
  page,
  request,
}) => {
  let script = "";
  if (process.env.TG_BAR_JS_FILE) {
    script = readFileSync(process.env.TG_BAR_JS_FILE, "utf8");
  } else {
    try {
      const response = await request.get(TG_BAR_URL, { timeout: 10_000 });
      if (response.ok()) script = await response.text();
    } catch {
      // offline
    }
  }
  test.skip(!script, "tg-bar.js is unreachable (set TG_BAR_JS_FILE to test offline)");

  await page.route(TG_BAR_URL, (route) =>
    route.fulfill({ contentType: "text/javascript", body: script }),
  );
  await openGame(page);

  const footer = page.locator('tg-footer[game="bank"]');
  await footer.scrollIntoViewIfNeeded();
  const link = (name: string) => footer.getByRole("link", { name, exact: true });

  await expect(link("Thorstein Games")).toHaveAttribute("href", "https://thorsteingames.com/");
  await expect(link("Tier Ranker")).toHaveAttribute("href", "https://thorsteingames.com/tier-ranker");
  await expect(link("Bracket Maker")).toHaveAttribute("href", "https://thorsteingames.com/bracket-maker");
  await expect(link("More Games")).toHaveAttribute("href", "https://thorsteingames.com/");
  await expect(link("Contact")).toHaveAttribute("href", "https://thorsteingames.com/contact");
  await expect(link("Privacy")).toHaveAttribute("href", "https://thorsteingames.com/privacy");
  // Bank doesn't link to itself.
  await expect(link("Bank")).toHaveCount(0);
  for (const name of ["Thorstein Games", "Tier Ranker", "Contact", "Privacy", "More Games"]) {
    await expect(link(name)).toBeVisible();
  }

  // The shared header bar renders too.
  await expect(page.locator('tg-bar[game="bank"]')).toHaveJSProperty("offsetHeight", 40);
});
