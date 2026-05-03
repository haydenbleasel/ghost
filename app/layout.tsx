import "./styles.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fonts } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/theme";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  description: "Simple, reliable dedicated game servers.",
  title: "Ghost",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html
    lang="en"
    className={cn(fonts, "font-sans", geist.variable)}
    suppressHydrationWarning
  >
    <body className="bg-background">
      <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
