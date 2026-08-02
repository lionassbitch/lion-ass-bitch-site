import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./product-flip.css";
import "./brand-refresh.css";
import "./system.css";
import "./commerce.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
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
      <body className={`${anton.variable} ${inter.variable}`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
