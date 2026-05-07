import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@/lib/utils";

const sans = Geist({
  display: "swap",
  preload: true,
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = Geist_Mono({
  display: "swap",
  preload: true,
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: "400",
});

export const fonts = cn(
  sans.variable,
  mono.variable,
  "touch-manipulation font-sans antialiased"
);
