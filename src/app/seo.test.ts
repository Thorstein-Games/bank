/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout, { metadata } from "./layout";
import robots from "./robots";
import { SITE_URL } from "./site";
import sitemap from "./sitemap";

const TARGET_PHRASE = "Play Bank Dice Game Online";

describe("SEO metadata", () => {
  it("starts the title with the target phrase", () => {
    const title = typeof metadata.title === "string" ? metadata.title : "";
    expect(title.startsWith(TARGET_PHRASE)).toBe(true);
  });

  it("renders canonical and og:url without a trailing slash", () => {
    // Set in <head>, not metadata, because trailingSlash: true would turn
    // them into /bank/ (which thorsteingames.com redirects to /bank).
    expect(SITE_URL.endsWith("/")).toBe(false);
    expect(metadata.alternates?.canonical).toBeUndefined();
    expect(metadata.openGraph).not.toHaveProperty("url");
    const html = renderToStaticMarkup(RootLayout({ children: null }));
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}"/>`);
    expect(html).toContain(`<meta property="og:url" content="${SITE_URL}"/>`);
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
      siteName: "Thorstein Games",
      images: [
        expect.objectContaining({
          url: `${SITE_URL}/og-image.jpg`,
          width: 1200,
          height: 630,
        }),
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [`${SITE_URL}/og-image.jpg`],
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
      expect.objectContaining({ url: SITE_URL }),
    );
  });
});
