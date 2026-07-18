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
  "/",
  "/how-it-works",
  "/sign-in",
  "/robots.txt",
  "/sitemap.xml",
  "/api/agent",
  "/api/snapshot",
  "/monitoring",
  "/.well-known/workflow",
];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return securityHeaders();
  }

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (!session) {
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
