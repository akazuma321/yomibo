import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  INVITE_COOKIE_NAME,
  isInviteCookieValueValid,
  isInviteRequired
} from "@/lib/invite";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "パスワードは8文字以上にしてください"),
  name: z.string().trim().min(1).max(50).optional()
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = SignupSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "入力が不正です" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    if (isInviteRequired()) {
      const c = req.cookies.get(INVITE_COOKIE_NAME)?.value;
      if (!isInviteCookieValueValid(c)) {
        return NextResponse.json(
          { error: "招待コードを入力してください（初回のみ）" },
          { status: 403 }
        );
      }
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "そのメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name ?? null,
        passwordHash,
        ...(isInviteRequired() ? { inviteAcceptedAt: new Date() } : {})
      }
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error: any) {
    console.error("POST /api/auth/signup error:", error);
    return NextResponse.json(
      { error: error.message || "新規登録に失敗しました" },
      { status: 500 }
    );
  }
}

