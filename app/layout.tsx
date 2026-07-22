import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import "./product-flip.css";
import "./brand-refresh.css";

const anton = Anton({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const inter = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lion Ass Bitch — A Diss Built a Dynasty",
  description: "Turned the slur into the signal. Shop every live Lion Ass Bitch piece through Shopify.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${anton.variable} ${inter.variable}`}>{children}</body></html>;
}
