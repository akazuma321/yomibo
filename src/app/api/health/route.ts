import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbConfigured, shouldUseFallbackStore } from "@/lib/fallback-store";

export async function GET() {
  // 本番での疎通確認用。機密は返さない。
  const dbConfigured = isDbConfigured();
  const storage = shouldUseFallbackStore() ? "fallback" : "db";

  if (!dbConfigured) {
    return NextResponse.json(
      {
        ok: false,
        storage,
        dbConfigured,
        message: "DATABASE_URL が未設定です"
      },
      { status: 500 }
    );
  }

  try {
    // PrismaのDB疎通確認（軽量）
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, storage, dbConfigured });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        storage,
        dbConfigured,
        message: e?.message || "DB connection failed"
      },
      { status: 500 }
    );
  }
}

