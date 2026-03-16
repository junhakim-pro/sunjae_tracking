import { NextRequest, NextResponse } from "next/server";
import { isValidSiteAccessToken, SITE_AUTH_COOKIE } from "@/lib/site-auth";

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/unlock") ||
    pathname.startsWith("/api/unlock") ||
    pathname.startsWith("/api/telegram/webhook") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

export async function middleware(request: NextRequest) {
  if (!process.env.SITE_PASSWORD || isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const hasAccess = await isValidSiteAccessToken(request.cookies.get(SITE_AUTH_COOKIE)?.value);

  if (hasAccess) {
    return NextResponse.next();
  }

  const unlockUrl = new URL("/unlock", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  unlockUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ["/((?!.*\\.).*)"]
};
