import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thorstein-games.github.io/bank";
const PAGE_TITLE = "Play Bank Dice Game Online";
const PAGE_DESCRIPTION =
  "Play Bank Dice Game Online in a multiplayer dice challenge where players grow a communal bank and choose when to lock in points.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
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
