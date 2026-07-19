import { createMiddleware, defaults, withVercelToolbar } from "@nosecone/next";
import type { NoseconeOptions } from "@nosecone/next";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

export const noseconeOptions: NoseconeOptions = {
  ...defaults,
  contentSecurityPolicy: false,
};

export const noseconeOptionsWithToolbar: NoseconeOptions =
  withVercelToolbar(noseconeOptions);

const securityHeaders = createMiddleware(noseconeOptions);

const PUBLIC_PATHS = [
  "/sign-in",
  "/robots.txt",
  "/api/agent",
  "/api/snapshot",
  "/.well-known/workflow",
];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
// Note: "/" itself is intentionally not public — the app root is the
// dashboard, and unauthenticated visitors are bounced to /sign-in.

const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return securityHeaders();
  }

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (!session) {
    // API consumers (fetch/EventSource) must see a 401, not a redirect —
    // following the redirect hands them the sign-in HTML with a 200.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return securityHeaders();
};

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
