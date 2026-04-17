import './styles.css';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { fonts } from '@/lib/fonts';
import { ThemeProvider } from '@/providers/theme';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Ultrabeam',
  description: 'Simple, reliable dedicated game servers.',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className={fonts} suppressHydrationWarning>
    <body className="bg-background">
      <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
