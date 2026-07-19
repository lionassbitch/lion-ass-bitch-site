import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import "./product-flip.css";

const anton = Anton({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const inter = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lion Ass Bitch — Wear the Myth",
  description: "Lion Ass Bitch makes art, apparel, and artifacts for anyone bold enough to enter.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${anton.variable} ${inter.variable}`}>{children}</body></html>;
}
