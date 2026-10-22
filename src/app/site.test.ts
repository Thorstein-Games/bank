/**
 * @jest-environment node
 */
// next/jest inlines NODE_ENV and NEXT_PUBLIC_* at compile time, so the
// production /bank prefix is checked against the real build in e2e/seo.spec.ts.
import { metadata } from "./layout";
import { BASE_PATH, SITE_URL, asset } from "./site";

describe("site helpers", () => {
  it("defaults the canonical address to thorsteingames.com/bank with no trailing slash", () => {
    expect(SITE_URL).toBe("https://thorsteingames.com/bank");
  });

  it("asset() prepends the base path (empty outside production)", () => {
    expect(BASE_PATH).toBe("");
    expect(asset("/favicon/favicon.svg")).toBe(`${BASE_PATH}/favicon/favicon.svg`);
  });
});

describe("share metadata", () => {
  it("routes every icon and the manifest through asset()", () => {
    const icons = metadata.icons as Record<string, Array<{ url: string }>>;
    const urls = [
      String(metadata.manifest),
      ...Object.values(icons).flatMap((list) => list.map((icon) => icon.url)),
    ];
    expect(urls.length).toBeGreaterThanOrEqual(5);
    for (const url of urls) {
      expect(url.startsWith(asset("/favicon/"))).toBe(true);
    }
  });

  it("uses an absolute 1200x630 share image under the canonical URL", () => {
    const images = metadata.openGraph?.images as Array<{ url: string; width: number; height: number }>;
    expect(images[0]).toMatchObject({
      url: `${SITE_URL}/og-image.jpg`,
      width: 1200,
      height: 630,
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [`${SITE_URL}/og-image.jpg`],
    });
  });
});
