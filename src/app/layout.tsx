import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thorsteingames.com/bank";
const PAGE_TITLE = "Play Bank Dice Game Online";
const PAGE_DESCRIPTION =
  "Play Bank Dice Game Online in a multiplayer dice challenge where players grow a communal bank and choose when to lock in points.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  manifest: "/favicon/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      {
        url: "/favicon/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
    shortcut: [{ url: "/favicon/favicon.ico" }],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
      },
    ],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    siteName: "Bank Dice Game",
  },
  twitter: {
    card: "summary",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
