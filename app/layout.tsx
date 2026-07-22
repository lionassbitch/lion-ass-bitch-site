import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./product-flip.css";
import "./brand-refresh.css";

const anton = Anton({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const inter = Inter({ variable: "--font-body", subsets: ["latin"] });

const title = "Lion Ass Bitch — Turned a Diss Into Dominion";
const description = "They named the insult. We claimed the power. Shop every live Lion Ass Bitch piece through Shopify.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "lionassbitch.com";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og-dominion.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: socialImage, width: 1744, height: 910, alt: "Turned a Diss Into Dominion — Lion Ass Bitch" }],
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${anton.variable} ${inter.variable}`}>{children}</body></html>;
}
