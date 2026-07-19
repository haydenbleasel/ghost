import "./styles.css";
import { Analytics } from "@vercel/analytics/next";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SEO_URL } from "@/lib/env";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/theme";

const description =
  "Open-source dedicated game server platform. Spin up game servers on your own Hetzner Cloud account in seconds.";

export const metadata: Metadata = {
  applicationName: "Ghost",
  description,
  metadataBase: new URL(SEO_URL),
  openGraph: {
    description,
    siteName: "Ghost",
    type: "website",
  },
  title: {
    default: "Ghost — Open-source, self-hosted game servers",
    template: "%s | Ghost",
  },
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html
    lang="en"
    className={cn(
      GeistSans.variable,
      GeistMono.variable,
      GeistPixelSquare.variable,
      "touch-manipulation font-sans antialiased"
    )}
    suppressHydrationWarning
  >
    <body className="bg-background pb-32">
      <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </ThemeProvider>
      <Analytics />
    </body>
  </html>
);

export default RootLayout;
