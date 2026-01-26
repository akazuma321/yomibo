import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allArticles = await prisma.article.findMany({
      where: { userId },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    });

    const saved = allArticles.length;
    const read = allArticles.filter((a) => a.readAt !== null).length;
    const readPercentage = saved > 0 ? Math.round((read / saved) * 100) : 0;

    // 週のオフセットを取得（0=今週、1=先週、2=2週間前...）
    const { searchParams } = new URL(req.url);
    const weekOffset = parseInt(searchParams.get("weekOffset") || "0", 10);

    // 指定された週の開始日を計算
    const now = new Date();
    const currentWeekStart = startOfWeek(now);
    const targetWeekStart = new Date(currentWeekStart);
    targetWeekStart.setDate(targetWeekStart.getDate() - weekOffset * 7);
    const weeklyActivity = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(targetWeekStart);
      day.setDate(day.getDate() + i);
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const savedCount = allArticles.filter(
        (a) =>
          a.createdAt >= dayStart &&
          a.createdAt <= dayEnd
      ).length;

      const readCount = allArticles.filter(
        (a) =>
          a.readAt &&
          a.readAt >= dayStart &&
          a.readAt <= dayEnd
      ).length;

      weeklyActivity.push({
        day: ["月", "火", "水", "木", "金", "土", "日"][i],
        saved: savedCount,
        read: readCount
      });
    }

    // タグの集計
    const tagCount = new Map<string, number>();
    for (const article of allArticles) {
      for (const at of article.tags) {
        const name = at.tag.name;
        tagCount.set(name, (tagCount.get(name) ?? 0) + 1);
      }
    }

    const tags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // 推定: 「興味が高そうなタグ」(頻度 + 読了比率 + 直近の加重)
    const nowMs = Date.now();
    const tagScore = new Map<
      string,
      { total: number; read: number; recency: number }
    >();

    for (const a of allArticles) {
      const t = a.tags.map((at) => at.tag.name);
      if (t.length === 0) continue;

      const baseDate = (a.readAt ?? a.createdAt).getTime();
      const daysAgo = Math.max(0, (nowMs - baseDate) / (1000 * 60 * 60 * 24));
      // 14日で半減するイメージ（適当な妥協値）
      const rec = Math.exp(-daysAgo / 14);

      for (const name of t) {
        const cur = tagScore.get(name) ?? { total: 0, read: 0, recency: 0 };
        cur.total += 1;
        if (a.readAt) cur.read += 1;
        cur.recency += rec;
        tagScore.set(name, cur);
      }
    }

    const recommendedTags = Array.from(tagScore.entries())
      .map(([name, v]) => {
        const score = v.total * 1 + v.read * 2 + v.recency * 3;
        const reasons: string[] = [];
        if (v.read >= Math.max(2, Math.ceil(v.total * 0.5))) {
          reasons.push("読了記事で多い");
        }
        if (v.recency >= 1.5) {
          reasons.push("最近よく見ている");
        }
        if (reasons.length === 0 && v.total >= 2) {
          reasons.push("頻出");
        }
        return {
          name,
          score: Math.round(score * 100) / 100,
          count: v.total,
          readCount: v.read,
          reason: reasons.join(" / ")
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    return NextResponse.json({
      saved,
      read,
      readPercentage,
      weeklyActivity,
      tags,
      recommendedTags
    });
  } catch (error: any) {
    console.error("GET /api/insights/stats error:", error);
    return NextResponse.json(
      { error: error.message || "統計の取得に失敗しました" },
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
