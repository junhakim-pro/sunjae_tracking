import { NextRequest, NextResponse } from "next/server";
import { createSiteAccessToken, SITE_AUTH_COOKIE } from "@/lib/site-auth";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;

  if (!password) {
    return NextResponse.json({ ok: false, error: "SITE_PASSWORD가 설정되지 않았어요." }, { status: 500 });
  }

  const payload = (await request.json()) as { password?: string; next?: string };

  if (!payload.password || payload.password !== password) {
    return NextResponse.json({ ok: false, error: "비밀번호가 맞지 않아요." }, { status: 401 });
  }

  const token = await createSiteAccessToken(password);
  const response = NextResponse.json({
    ok: true,
    next: payload.next && payload.next.startsWith("/") ? payload.next : "/"
  });

  response.cookies.set({
    name: SITE_AUTH_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS
  });

  return response;
}

