import { metadata } from "./layout";
import robots from "./robots";
import sitemap from "./sitemap";

const TARGET_PHRASE = "Play Bank Dice Game Online";

describe("SEO metadata", () => {
  it("starts the title with the target phrase and includes canonical metadata", () => {
    const title = typeof metadata.title === "string" ? metadata.title : "";
    expect(title.startsWith(TARGET_PHRASE)).toBe(true);
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("includes the target phrase exactly once in description metadata", () => {
    const description = metadata.description ?? "";
    const phraseMatches =
      typeof description === "string"
        ? description.match(new RegExp(TARGET_PHRASE, "g"))
        : null;

    expect(phraseMatches).toHaveLength(1);
  });

  it("defines Open Graph and Twitter share metadata", () => {
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: "/",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary",
    });
  });

  it("allows indexing via robots and includes a sitemap route", () => {
    const robotsConfig = robots();
    const sitemapEntries = sitemap();

    expect(robotsConfig.rules).toEqual({
      userAgent: "*",
      allow: "/",
    });
    expect(robotsConfig.sitemap).toContain("/sitemap.xml");
    expect(sitemapEntries).toContainEqual(
      expect.objectContaining({
        url: expect.stringMatching(/^https?:\/\/.+/),
      }),
    );
  });
});
