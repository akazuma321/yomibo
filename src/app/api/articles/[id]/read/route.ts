import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { shouldUseFallbackStore, updateArticleForUser } from "@/lib/fallback-store";

interface Params {
  params: {
    id: string;
  };
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "id が必要です" }, { status: 400 });
    }

    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (shouldUseFallbackStore()) {
      const updated = await updateArticleForUser(userId, id, {
        readAt: new Date().toISOString()
      });
      if (!updated) {
        return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
      }
      return NextResponse.json({ article: updated });
    }

    const updated = await prisma.article.updateMany({
      where: { id, userId },
      data: { readAt: new Date() }
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
    }

    const article = await prisma.article.findFirst({ where: { id, userId } });
    if (!article) {
      return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      article: {
        ...article,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        readAt: article.readAt ? article.readAt.toISOString() : null
      }
    });
  } catch (error: any) {
    console.error("POST /api/articles/[id]/read error:", error);
    return NextResponse.json(
      { error: error.message || "読了状態の更新に失敗しました" },
      { status: 500 }
    );
  }
}

