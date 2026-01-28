import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEmbedding } from "@/lib/ai";
import { fetchTitleAndSummary } from "@/lib/fetch-title";
import { auth } from "@/auth";
import { extractArticleTags } from "@/lib/tags";
import { mergeTagsToArticle } from "@/lib/tagging";
import {
  createArticleForUser,
  shouldUseFallbackStore,
  listArticlesForUser
} from "@/lib/fallback-store";

function hostnameOrUrl(rawUrl: string) {
  try {
    const u = new URL(rawUrl);
    return u.hostname.replace(/^www\./, "") || rawUrl;
  } catch {
    return rawUrl;
  }
}

// GET: 最近追加した記事一覧
export async function GET() {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = (session?.user as any)?.email as string | undefined;
    const userName = (session?.user as any)?.name as string | undefined;

    // DB未設定の場合はローカルJSONにフォールバック（開発環境で記事追加を通す）
    if (shouldUseFallbackStore()) {
      const articles = await listArticlesForUser(userId, 50);
      return NextResponse.json({ storage: "fallback", articles });
    }

    const articles = await prisma.article.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        tags: {
          include: { tag: true }
        }
      }
    });

    return NextResponse.json({
      storage: "db",
      articles: articles.map((a) => ({
        id: a.id,
        url: a.url,
        title: a.title,
        summary: a.summary,
        bodyLength: a.bodyLength,
        readAt: a.readAt ? a.readAt.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        tags: a.tags.map((at) => at.tag.name)
      }))
    });
  } catch (error: any) {
    console.error("GET /api/articles error:", error);
    return NextResponse.json(
      { error: error.message || "記事の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: URL を登録（簡易的にタイトル・要約はダミー）
export async function POST(req: NextRequest) {
  try {
    const { url, mode } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url が必要です" },
        { status: 400 }
      );
    }
    const fastMode = mode === "fast";

    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = (session?.user as any)?.email as string | undefined;
    const userName = (session?.user as any)?.name as string | undefined;

    // 体感速度を優先: まずは即保存して返す（重い処理は /api/articles/[id]/update-title に逃がす）
    if (fastMode) {
      const title = hostnameOrUrl(url);
      const summary: string | null = null;
      const bodyLength: number | null = null;
      const embeddingJson: string | null = null;

      if (shouldUseFallbackStore()) {
        const article = await createArticleForUser(userId, {
          userEmail: userEmail ? String(userEmail) : null,
          userName: userName ? String(userName) : null,
          url,
          title,
          summary,
          bodyLength,
          embedding: embeddingJson,
          tags: [],
          readAt: null
        });
        return NextResponse.json({
          storage: "fallback",
          article: { ...article, tags: article.tags ?? [] }
        });
      }

      const article = await prisma.article.create({
        data: {
          url,
          title,
          summary,
          bodyLength,
          userId,
          embedding: embeddingJson
        }
      });

      return NextResponse.json({
        storage: "db",
        article: {
          id: article.id,
          url: article.url,
          title: article.title,
          summary: article.summary,
          bodyLength: article.bodyLength,
          readAt: article.readAt ? article.readAt.toISOString() : null,
          createdAt: article.createdAt.toISOString(),
          updatedAt: article.updatedAt.toISOString(),
          tags: []
        }
      });
    }

    // URLからタイトル、説明、本文の文字数を取得
    let title = url;
    let summary: string | null = null;
    let bodyLength: number | null = null;
    try {
      const fetched = await fetchTitleAndSummary(url);
      if (fetched.title) {
        title = fetched.title;
      }
      summary = fetched.summary;
      bodyLength = fetched.bodyLength > 0 ? fetched.bodyLength : null;
    } catch (e) {
      console.error("failed to fetch title", e);
    }

    // 埋め込みを作成（タイトルとURLを組み合わせて）
    let embeddingJson: string | null = null;
    try {
      const embeddingText = `${title} ${url}`;
      const embedding = await createEmbedding(embeddingText);
      if (embedding) {
        embeddingJson = JSON.stringify(embedding);
      }
    } catch (e) {
      console.error("failed to create embedding", e);
    }

    // DB未設定の場合はローカルJSONにフォールバック（タグは配列として保存）
    if (shouldUseFallbackStore()) {
      const tags = extractArticleTags({ title, summary, url });
      const article = await createArticleForUser(userId, {
        userEmail: userEmail ? String(userEmail) : null,
        userName: userName ? String(userName) : null,
        url,
        title,
        summary,
        bodyLength,
        embedding: embeddingJson,
        tags,
        readAt: null
      });
      return NextResponse.json({ storage: "fallback", article });
    }

    const article = await prisma.article.create({
      data: {
        url,
        title,
        summary,
        bodyLength,
        userId,
        embedding: embeddingJson
      }
    });

    // 自動タグ付け（ハッシュタグ/キーワード抽出）
    try {
      const tags = extractArticleTags({ title, summary, url });
      await mergeTagsToArticle(prisma, { articleId: article.id, tagNames: tags });
    } catch (e) {
      console.error("failed to auto-tag article", e);
    }

    const articleWithTags = await prisma.article.findUnique({
      where: { id: article.id },
      include: { tags: { include: { tag: true } } }
    });

    return NextResponse.json({
      storage: "db",
      article: {
        id: article.id,
        url: article.url,
        title: article.title,
        summary: article.summary,
        bodyLength: article.bodyLength,
        readAt: article.readAt ? article.readAt.toISOString() : null,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        tags: (articleWithTags?.tags ?? []).map((at) => at.tag.name)
      }
    });
  } catch (error: any) {
    console.error("POST /api/articles error:", error);
    return NextResponse.json(
      { error: error.message || "記事の保存に失敗しました" },
      { status: 500 }
    );
  }
}

