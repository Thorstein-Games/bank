// Canonical address (no trailing slash, matching the sitemap and thorsteingames.com links).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thorsteingames.com/bank";

// Metadata icon/manifest URLs don't get Next's basePath, so prefix them by hand.
export const BASE_PATH = process.env.NODE_ENV === "production" ? "/bank" : "";
export const asset = (path: string) => `${BASE_PATH}${path}`;
