import "./styles.css";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import type { SoftwareApplication, WithContext } from "schema-dts";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/lib/env";
import { fonts } from "@/lib/fonts";
import { JsonLd } from "@/lib/seo/json-ld";
import { createMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/theme";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
  url: env.NEXT_PUBLIC_APP_URL,
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html
    lang="en"
    className={cn(fonts, "font-sans", geist.variable, geistMono.variable)}
    suppressHydrationWarning
  >
    <body className="bg-background">
      <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </ThemeProvider>
      <JsonLd code={softwareApplicationJsonLd} />
      <Analytics />
    </body>
  </html>
);

export default RootLayout;
