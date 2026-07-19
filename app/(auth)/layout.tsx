import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  description: "Sign in to your Ghost instance.",
  robots: { follow: false, index: false },
  title: "Sign in",
};

const AuthLayout = async ({ children }: { children: ReactNode }) => {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">{children}</div>
    </main>
  );
};

export default AuthLayout;
