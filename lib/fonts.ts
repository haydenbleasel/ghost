import { cn } from "@/lib/utils";
import { Geist, Geist_Mono } from "next/font/google";

const sans = Geist({
  display: "swap",
  preload: true,
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = Geist_Mono({
  display: "swap",
  preload: true,
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "400",
});

export const fonts = cn(sans.variable, mono.variable, "touch-manipulation font-sans antialiased");
