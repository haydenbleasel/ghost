"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const linkClass =
  "relative rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground after:pointer-events-none after:absolute after:-bottom-[5px] after:inset-x-3 after:h-px after:bg-foreground after:opacity-0 aria-[current=page]:text-foreground aria-[current=page]:after:opacity-100";

export const FloatingNav = ({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) => {
  const pathname = usePathname();
  const isActive = (href: string) => (pathname === href ? "page" : undefined);

  return (
    <nav
      aria-label="Primary"
      className="-translate-x-1/2 fixed bottom-6 left-1/2 z-40 flex items-center gap-1 rounded-full border border-foreground/10 bg-background/80 p-1 pl-3 shadow-foreground/5 shadow-lg backdrop-blur"
    >
      <Link href="/" aria-current={isActive("/")} className={linkClass}>
        Home
      </Link>
      <Link
        href="/how-it-works"
        aria-current={isActive("/how-it-works")}
        className={linkClass}
      >
        How it works
      </Link>
      <Link
        href="https://github.com/haydenbleasel/ghost"
        target="_blank"
        rel="noreferrer"
        className={cn(linkClass, "after:hidden hidden sm:inline-block")}
      >
        Source
      </Link>
      {isAuthenticated ? (
        <Button asChild size="sm" className="ml-2 rounded-full">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      ) : (
        <>
          <Link
            href="/sign-in"
            aria-current={isActive("/sign-in")}
            className={cn(linkClass, "ml-2 hidden sm:inline-block")}
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </>
      )}
    </nav>
  );
};
