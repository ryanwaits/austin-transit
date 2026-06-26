import { EB_Garamond, Inter } from "next/font/google";

// EB Garamond carries the editorial voice (body + headings); Inter handles UI,
// chart axes, and labels. Exposed as CSS variables consumed in globals.css.
export const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-serif-loaded",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-loaded",
  display: "swap",
});
