import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ebGaramond, inter } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "How long does the bus actually take?",
  description:
    "An independent measurement of CapMetro's on-time performance, and the riders who bear the cost when promises slip.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${ebGaramond.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
