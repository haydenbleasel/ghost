import Link from "next/link";
import type { ReactNode } from "react";

import { HomeHeader } from "@/app/components/home-header";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

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
            <Logo className="size-6" />
            <span className="font-display text-lg font-medium">Ghost</span>
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
              className="hidden text-muted-foreground text-sm transition-colors hover:text-foreground sm:inline"
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
                  className="hidden text-muted-foreground text-sm transition-colors hover:text-foreground sm:inline"
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
