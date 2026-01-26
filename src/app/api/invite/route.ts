import { NextRequest, NextResponse } from "next/server";
import {
  INVITE_COOKIE_NAME,
  createInviteCookieValue,
  isInviteCookieValueValid,
  isInviteCodeValid,
  isInviteRequired
} from "@/lib/invite";

export async function GET(req: NextRequest) {
  const value = req.cookies.get(INVITE_COOKIE_NAME)?.value;
  return NextResponse.json({
    required: isInviteRequired(),
    hasCookie: Boolean(value),
    cookieValid: isInviteCookieValueValid(value)
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "");

    if (!isInviteCodeValid(code)) {
      return NextResponse.json(
        { error: "招待コードが違います" },
        { status: 403 }
      );
    }

    const res = NextResponse.json({ ok: true });
    const maxAgeSec = Number(process.env.INVITE_COOKIE_MAX_AGE_SEC ?? "86400");

    res.cookies.set({
      name: INVITE_COOKIE_NAME,
      value: createInviteCookieValue(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: maxAgeSec
    });

    return res;
  } catch (error: any) {
    console.error("POST /api/invite error:", error);
    return NextResponse.json(
      { error: error.message || "招待コードの確認に失敗しました" },
      { status: 500 }
    );
  }
}

