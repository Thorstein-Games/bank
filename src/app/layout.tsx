import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SITE_URL, asset } from "./site";

const PAGE_TITLE = "Play Bank Dice Game Online";
const PAGE_DESCRIPTION =
  "Play Bank Dice Game Online in a multiplayer dice challenge where players grow a communal bank and choose when to lock in points.";

const OG_IMAGE = {
  url: `${SITE_URL}/og-image.jpg`,
  width: 1200,
  height: 630,
  alt: "Bank: the push-your-luck dice game. Free online, 2–16 players.",
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Bank Dice Game",
  url: SITE_URL,
  image: OG_IMAGE.url,
  description: PAGE_DESCRIPTION,
  applicationCategory: "GameApplication",
  operatingSystem: "Any (web browser)",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: {
    "@type": "Organization",
    name: "Thorstein Games",
    url: "https://thorsteingames.com/",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  manifest: asset("/favicon/site.webmanifest"),
  icons: {
    icon: [
      { url: asset("/favicon/favicon.ico") },
      { url: asset("/favicon/favicon.svg"), type: "image/svg+xml" },
      {
        url: asset("/favicon/favicon-96x96.png"),
        sizes: "96x96",
        type: "image/png",
      },
    ],
    shortcut: [{ url: asset("/favicon/favicon.ico") }],
    apple: [
      {
        url: asset("/favicon/apple-touch-icon.png"),
        sizes: "180x180",
      },
    ],
  },
  // canonical and og:url are rendered in <head> below: with trailingSlash
  // on, Next would rewrite them to /bank/, which thorsteingames.com redirects.
  openGraph: {
    type: "website",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    siteName: "Thorstein Games",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

// Shared Thorstein Games bar and footer (see CLAUDE.md). Set to "" to keep
// it from loading (e.g. in tests).
const TG_BAR_SRC =
  process.env.NEXT_PUBLIC_TG_BAR_SRC ?? "https://thorsteingames.com/tg-bar.js";

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:url" content={SITE_URL} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        {TG_BAR_SRC && <script src={TG_BAR_SRC} async />}
        <tg-bar game="bank"></tg-bar>
        {children}
      </body>
    </html>
  );
}
