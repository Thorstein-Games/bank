import { expect, openGame, test } from "./fixtures";

const SITE_URL = "https://thorsteingames.com/bank";

test.describe("page load and head tags", () => {
  test("loads with the SEO heading, intro and no console errors", async ({ page }) => {
    await openGame(page);
    await expect(page).toHaveTitle(/^Play Bank Dice Game Online/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Play Bank Dice Game Online");
    await expect(page.getByRole("heading", { name: "Setup" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Game" })).toBeDisabled();
  });

  test("canonical and og:url are exactly the canonical URL", async ({ page }) => {
    await openGame(page);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", SITE_URL);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", SITE_URL);
  });

  test("share card tags are present and the image is served", async ({ page, request }) => {
    await openGame(page);
    const ogImage = `${SITE_URL}/og-image.jpg`;
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", ogImage);
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Play Bank Dice Game Online/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", ogImage);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Play Bank Dice Game Online/);

    const local = await request.get("/bank/og-image.jpg");
    expect(local.status()).toBe(200);
    expect(local.headers()["content-type"]).toBe("image/jpeg");
  });

  test("favicons and manifest are /bank-prefixed and all resolve", async ({ page, request }) => {
    await openGame(page);
    const hrefs = await page
      .locator('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThanOrEqual(5);

    for (const href of hrefs) {
      expect(href, href).toMatch(/^\/bank\/favicon\//);
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }

    const manifestHref = hrefs.find((href) => href.endsWith(".webmanifest"));
    expect(manifestHref).toBeDefined();
    const manifest = await (await request.get(manifestHref!)).json();
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons as Array<{ src: string }>) {
      const url = new URL(icon.src, `http://x${manifestHref}`).pathname;
      expect((await request.get(url)).status(), url).toBe(200);
    }
  });

  test("JSON-LD describes the web app at the canonical URL", async ({ page }) => {
    await openGame(page);
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(json ?? "{}");
    expect(data["@type"]).toBe("WebApplication");
    expect(data.url).toBe(SITE_URL);
  });

  test("robots.txt and sitemap.xml are served and point at the canonical URL", async ({ request }) => {
    const robots = await request.get("/bank/robots.txt");
    expect(robots.status()).toBe(200);
    const robotsText = await robots.text();
    expect(robotsText).toContain("Allow: /");
    expect(robotsText).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);

    const sitemap = await request.get("/bank/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain(`<loc>${SITE_URL}</loc>`);
  });

  test("loads the shared Thorstein Games bar and footer", async ({ page }) => {
    await openGame(page);
    await expect(page.locator('script[src="https://thorsteingames.com/tg-bar.js"]')).toHaveCount(1);
    await expect(page.locator('tg-bar[game="bank"]')).toHaveCount(1);
    await expect(page.locator('tg-footer[game="bank"]')).toHaveCount(1);
    // Ads only appear outside a game: one banner above the footer.
    await expect(page.locator("tg-ad")).toHaveCount(1);
    await expect(page.locator('tg-ad[format="banner"]')).toHaveCount(1);
  });
});

test("How to play section explains the rules", async ({ page }) => {
  await openGame(page);
  const howTo = page.locator("section").filter({
    has: page.getByRole("heading", { name: "How to play Bank" }),
  });
  await howTo.scrollIntoViewIfNeeded();
  await expect(howTo.getByRole("heading", { name: "How to play Bank" })).toBeVisible();
  await expect(howTo).toContainText("a 7 ends the round");
  for (const title of ["Round Flow", "Dice Effects", "Banking", "Winning"]) {
    await expect(howTo.getByRole("heading", { name: title })).toBeVisible();
  }
});

test.describe("404", () => {
  // The browser logs the 404 response itself.
  test.use({ allowConsoleErrors: true });

  test("unknown paths under /bank get the 404 page", async ({ page }) => {
    const response = await page.goto("/bank/nope/");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
});
