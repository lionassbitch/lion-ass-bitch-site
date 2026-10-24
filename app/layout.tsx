import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./product-flip.css";
import "./brand-refresh.css";
import "./system.css";
import "./commerce.css";
import SiteChrome from "./components/SiteChrome";
import Analytics from "./components/Analytics";
import { site } from "./lib/site";

const anton = Anton({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const inter = Inter({ variable: "--font-body", subsets: ["latin"] });

const title = "Lion Ass Bitch — Turned a Diss Into Dominion";
const description = site.description;

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "lionassbitch.com";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = `${origin}/og-dominion.png`;

  return {
    metadataBase: new URL(origin),
    title: {
      default: title,
      template: "%s · Lion Ass Bitch",
    },
    description,
    applicationName: site.name,
    openGraph: {
      title,
      description,
      siteName: site.name,
      images: [
        {
          url: socialImage,
          width: 1744,
          height: 910,
          alt: "LAB Ancestors Crest Boxy Zip Hoodie — Turned a Diss Into Dominion",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cinzel+Decorative:wght@700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${anton.variable} ${inter.variable}`}>
        <SiteChrome>{children}</SiteChrome>
        <Analytics />
      </body>
    </html>
  );
}
