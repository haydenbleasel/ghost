import Link from "next/link";
import type { ReactNode } from "react";

import { FloatingNav } from "@/app/components/floating-nav";
import { getSession } from "@/lib/session";

const MarketingLayout = async ({ children }: { children: ReactNode }) => {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">{children}</main>

      <footer className="border-t border-foreground/10">
        <p className="mx-auto w-full max-w-6xl px-6 py-10 text-center text-muted-foreground text-sm">
          Copyright{" "}
          <Link
            href="https://haydenbleasel.com/"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            Hayden Bleasel
          </Link>{" "}
          {new Date().getFullYear()}. All rights reserved.{" "}
          <Link
            href="https://github.com/haydenbleasel/ghost"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            Open source
          </Link>{" "}
          and free forever.
        </p>
      </footer>

      <FloatingNav isAuthenticated={isAuthenticated} />
    </div>
  );
};

export default MarketingLayout;
