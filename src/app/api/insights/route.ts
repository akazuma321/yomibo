import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWeeklyInsightSummary } from "@/lib/ai";
import { auth } from "@/auth";

// GET: 直近数週間のインサイトを取得（簡易版: 読了記事の件数と代表タグをまとめるだけ）
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const articles = await prisma.article.findMany({
      where: {
        userId,
        readAt: { not: null }
      },
      orderBy: { readAt: "desc" },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    });

    if (articles.length === 0) {
      return NextResponse.json({ insights: [] });
    }

    // 週ごとにグルーピング
    const byWeek = new Map<string, typeof articles>();

    for (const a of articles) {
      const d = a.readAt ?? a.createdAt;
      const weekStart = startOfWeek(d);
      const key = weekStart.toISOString();
      const list = byWeek.get(key) ?? [];
      list.push(a);
      byWeek.set(key, list);
    }

    const insightsPayload = [];

    for (const [weekKey, arts] of byWeek.entries()) {
      const total = arts.length;
      const tagCount = new Map<string, number>();

      for (const art of arts) {
        for (const at of art.tags) {
          const name = at.tag.name;
          tagCount.set(name, (tagCount.get(name) ?? 0) + 1);
        }
      }

      const topTags = Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      const bulletLines = [
        `・この週に読了した記事数: ${total}件`,
        topTags.length > 0
          ? `・よく登場したトピック: ${topTags.join(", ")}`
          : "・タグ付けされた記事はまだありません。"
      ];

      const bulletSummary = bulletLines.join("\n");

      let finalSummary = bulletSummary;
      try {
        const aiSummary = await generateWeeklyInsightSummary(bulletSummary);
        if (aiSummary) {
          finalSummary = aiSummary;
        }
      } catch (e) {
        console.error("failed to generate weekly insight summary", e);
      }

      insightsPayload.push({
        id: weekKey,
        weekStart: weekKey,
        createdAt: new Date().toISOString(),
        summary: finalSummary
      });
    }

    // 週の開始日でソート（新しい順）
    insightsPayload.sort(
      (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
    );

    return NextResponse.json({ insights: insightsPayload });
  } catch (error: any) {
    console.error("GET /api/insights error:", error);
    return NextResponse.json(
      { error: error.message || "インサイトの取得に失敗しました" },
      { status: 500 }
    );
  }
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0: Sun, 1: Mon, ...
  const diff = (day + 6) % 7; // 月曜始まり
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

