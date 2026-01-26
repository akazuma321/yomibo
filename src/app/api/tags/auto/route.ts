import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { extractArticleTags } from "@/lib/tags";
import { mergeTagsToArticle } from "@/lib/tagging";

// 既存記事の「未タグ」を一括で自動タグ付けする
export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targets = await prisma.article.findMany({
      where: {
        userId,
        tags: { none: {} }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    let processed = 0;
    let totalAdded = 0;
    for (const a of targets) {
      const tags = extractArticleTags({ title: a.title, summary: a.summary, url: a.url });
      const res = await mergeTagsToArticle(prisma, { articleId: a.id, tagNames: tags });
      processed += 1;
      totalAdded += res.added;
    }

    const remaining = await prisma.article.count({
      where: { userId, tags: { none: {} } }
    });

    return NextResponse.json({
      processed,
      addedTags: totalAdded,
      remaining
    });
  } catch (error: any) {
    console.error("POST /api/tags/auto error:", error);
    return NextResponse.json(
      { error: error.message || "タグ付けに失敗しました" },
      { status: 500 }
    );
  }
}

