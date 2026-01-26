import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchTitleAndSummary } from "@/lib/fetch-title";
import { createEmbedding } from "@/lib/ai";
import { auth } from "@/auth";
import { extractArticleTags } from "@/lib/tags";
import { mergeTagsToArticle } from "@/lib/tagging";

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

    // 記事を取得
    const article = await prisma.article.findFirst({
      where: { id, userId }
    });

    if (!article) {
      return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
    }

    // URLからタイトル、説明、本文の文字数を取得
    let title = article.url;
    let summary: string | null = article.summary;
    let bodyLength: number | null = article.bodyLength;
    
    try {
      const fetched = await fetchTitleAndSummary(article.url);
      if (fetched.title && fetched.title !== article.url) {
        title = fetched.title;
      }
      if (fetched.summary) {
        summary = fetched.summary;
      }
      if (fetched.bodyLength > 0) {
        bodyLength = fetched.bodyLength;
      }
    } catch (e) {
      console.error("failed to fetch title", e);
    }

    // 埋め込みを更新
    let embeddingJson: string | null = article.embedding;
    try {
      const embeddingText = `${title} ${article.url}`;
      const embedding = await createEmbedding(embeddingText);
      if (embedding) {
        embeddingJson = JSON.stringify(embedding);
      }
    } catch (e) {
      console.error("failed to create embedding", e);
    }

    // 記事を更新
    const updated = await prisma.article.update({
      where: { id },
      data: {
        title,
        summary,
        bodyLength,
        embedding: embeddingJson
      }
    });

    // 自動タグ付け（タイトル/要約が更新されたので再抽出）
    try {
      const tags = extractArticleTags({ title, summary, url: updated.url });
      await mergeTagsToArticle(prisma, { articleId: updated.id, tagNames: tags });
    } catch (e) {
      console.error("failed to auto-tag updated article", e);
    }

    const updatedWithTags = await prisma.article.findUnique({
      where: { id: updated.id },
      include: { tags: { include: { tag: true } } }
    });

    return NextResponse.json({
      article: {
        id: updated.id,
        url: updated.url,
        title: updated.title,
        summary: updated.summary,
        bodyLength: updated.bodyLength,
        readAt: updated.readAt ? updated.readAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        tags: (updatedWithTags?.tags ?? []).map((at) => at.tag.name)
      }
    });
  } catch (error: any) {
    console.error("POST /api/articles/[id]/update-title error:", error);
    return NextResponse.json(
      { error: error.message || "タイトルの更新に失敗しました" },
      { status: 500 }
    );
  }
}
