import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEmbedding, cosineSimilarity, parseEmbedding } from "@/lib/ai";
import { auth } from "@/auth";
import { searchArticlesForUser, shouldUseFallbackStore } from "@/lib/fallback-store";

// 簡易版: タイトル・URL・サマリーに対する LIKE 検索
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query が必要です" },
        { status: 400 }
      );
    }

    const q = query.trim();

    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (shouldUseFallbackStore()) {
      const articles = await searchArticlesForUser(userId, q, 50);
      return NextResponse.json({ articles });
    }

    // まずは自分の記事を取得し、埋め込みがあればセマンティック検索を試す
    const all = await prisma.article.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        tags: {
          include: { tag: true }
        }
      }
    });

    let articles = all;

    try {
      const queryEmbedding = await createEmbedding(q);
      if (queryEmbedding) {
        const scored = all
          .map((a) => {
            const emb = parseEmbedding(a.embedding);
            if (!emb) return null;
            const score = cosineSimilarity(queryEmbedding, emb);
            return { article: a, score };
          })
          .filter(
            (v): v is { article: (typeof all)[number]; score: number } => v !== null
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, 50)
          .map((x) => x.article);

        if (scored.length > 0) {
          articles = scored;
        } else {
          // 埋め込みが無い場合は LIKE 検索にフォールバック
          articles = await prisma.article.findMany({
            where: {
              userId,
              OR: [
                { title: { contains: q } },
                { url: { contains: q } },
                { summary: { contains: q } }
              ]
            },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
              tags: {
                include: { tag: true }
              }
            }
          });
        }
      } else {
        // API キー未設定などで埋め込みが使えない場合も LIKE 検索
        articles = await prisma.article.findMany({
          where: {
            userId,
            OR: [
              { title: { contains: q } },
              { url: { contains: q } },
              { summary: { contains: q } }
            ]
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            tags: {
              include: { tag: true }
            }
          }
        });
      }
    } catch (e) {
      console.error("semantic search failed, fallback to LIKE", e);
      articles = await prisma.article.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q } },
            { url: { contains: q } },
            { summary: { contains: q } }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          tags: {
            include: { tag: true }
          }
        }
      });
    }

    return NextResponse.json({
      articles: articles.map((a) => ({
        id: a.id,
        url: a.url,
        title: a.title,
        summary: a.summary,
        readAt: a.readAt ? a.readAt.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
        tags: (a.tags ?? []).map((at) => at.tag.name)
      }))
    });
  } catch (error: any) {
    console.error("POST /api/search error:", error);
    return NextResponse.json(
      { error: error.message || "検索に失敗しました" },
      { status: 500 }
    );
  }
}

