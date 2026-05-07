import "./styles.css";
import { Analytics } from "@vercel/analytics/next";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";
import Script from "next/script";
import type { ReactNode } from "react";
import type { SoftwareApplication, WithContext } from "schema-dts";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SEO_URL } from "@/lib/env";
import { JsonLd } from "@/lib/seo/json-ld";
import { createMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/theme";

const homeDescription =
  "Open-source dedicated game server platform. Spin up Minecraft, Valheim, Rust, Palworld, Enshrouded and Terraria on your own Hetzner Cloud account in seconds.";

export const metadata = createMetadata({
  bareTitle: true,
  description: homeDescription,
  title: "Ghost — Open-source, self-hosted game servers",
});

const softwareApplicationJsonLd: WithContext<SoftwareApplication> = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  applicationCategory: "GameApplication",
  description: homeDescription,
  license: "https://opensource.org/licenses/MIT",
  name: "Ghost",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  operatingSystem: "Linux",
  sameAs: ["https://github.com/haydenbleasel/ghost"],
  url: SEO_URL,
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
    <body className="bg-background">
      <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </ThemeProvider>
      <JsonLd code={softwareApplicationJsonLd} />
      <Analytics />
      <Script src="https://ui.sh/ui-picker.js" />
    </body>
  </html>
);

export default RootLayout;
