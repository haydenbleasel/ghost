import Link from "next/link";
import type { ReactNode } from "react";

import { HomeHeader } from "@/app/components/home-header";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

const GhostLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 14 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    <title>Ghost</title>
    <path
      d="M12.5 7C12.5 3.96243 10.0376 1.5 7 1.5C3.96243 1.5 1.5 3.96243 1.5 7V14.2754L1.91992 13.8848C2.79553 13.0691 4.09852 12.9133 5.1416 13.5L6.87695 14.4766C6.95321 14.5194 7.04679 14.5194 7.12305 14.4766L8.8584 13.5C9.9015 12.9133 11.2045 13.0691 12.0801 13.8848L12.5 14.2754V7ZM14 14.667C14 15.8294 12.6139 16.4319 11.7637 15.6396L11.0576 14.9824C10.6598 14.6118 10.0677 14.541 9.59375 14.8076L7.8584 15.7842C7.32581 16.0835 6.67516 16.0835 6.14258 15.7842L4.40625 14.8076C3.93237 14.5411 3.34025 14.6118 2.94238 14.9824L2.23633 15.6396C1.38606 16.4319 0 15.8294 0 14.667V7C0 3.13401 3.13401 0 7 0C10.866 0 14 3.13401 14 7V14.667Z"
      fill="currentColor"
    />
    <path
      d="M4 6C4 5.44772 4.44772 5 5 5C5.55222 5 6 5.44769 6 6C6 6.55224 5.55224 7 5 7C4.44769 7 4 6.55222 4 6Z"
      fill="currentColor"
    />
    <path
      d="M8 6C8 5.44769 8.44778 5 9 5C9.55222 5 10 5.44769 10 6C10 6.55224 9.55224 7 9 7C8.44776 7 8 6.55224 8 6Z"
      fill="currentColor"
    />
  </svg>
);

const MarketingLayout = async ({ children }: { children: ReactNode }) => {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="flex min-h-dvh flex-col">
      <HomeHeader>
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            aria-label="Homepage"
            className="inline-flex items-center gap-2 font-medium tracking-tight"
          >
            <GhostLogo className="size-4" />
            <span>Ghost</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/how-it-works"
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              How it works
            </Link>
            <Link
              href="https://github.com/haydenbleasel/ghost"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              Source
            </Link>
            {isAuthenticated ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Button asChild size="sm">
                  <Link href="/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </HomeHeader>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-foreground/10">
        <p className="mx-auto w-full max-w-6xl px-6 py-10 text-center text-muted-foreground text-sm">
          Copyright Hayden Bleasel {new Date().getFullYear()}. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
};

export default MarketingLayout;
