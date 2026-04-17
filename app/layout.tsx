import './styles.css';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { fonts } from '@/lib/fonts';
import { ThemeProvider } from '@/providers/theme';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Ultrabeam',
  description: 'Simple, reliable dedicated game servers.',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className={cn(fonts, "font-sans", geist.variable)} suppressHydrationWarning>
    <body className="bg-background">
      <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
