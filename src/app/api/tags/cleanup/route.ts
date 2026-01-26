import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isNoisyTag, normalizeTag } from "@/lib/tags";

// 既存の「変なタグ」を一括で削除する（CuraQ寄せの品質担保）
export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // このユーザーに紐づくタグだけ対象にする
    const tagIds = await prisma.articleTag.findMany({
      where: { article: { userId } },
      select: { tagId: true },
      distinct: ["tagId"]
    });
    const ids = tagIds.map((x) => x.tagId);
    if (ids.length === 0) {
      return NextResponse.json({ removed: 0, remaining: 0 });
    }

    const tags = await prisma.tag.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true }
    });

    const noisy = tags.filter((t) => {
      const n = normalizeTag(t.name);
      if (!n) return true;
      return isNoisyTag(n);
    });

    let removed = 0;
    for (const t of noisy) {
      // 紐付けを消す（このユーザーの分だけ）
      const del = await prisma.articleTag.deleteMany({
        where: { tagId: t.id, article: { userId } }
      });
      removed += del.count;

      // 他ユーザー/他記事に使われてなければタグ自体を削除
      const stillUsed = await prisma.articleTag.count({ where: { tagId: t.id } });
      if (stillUsed === 0) {
        await prisma.tag.delete({ where: { id: t.id } });
      }
    }

    const remaining = await prisma.articleTag.count({
      where: { article: { userId } }
    });

    return NextResponse.json({ removed, remaining });
  } catch (error: any) {
    console.error("POST /api/tags/cleanup error:", error);
    return NextResponse.json(
      { error: error.message || "タグのクリーンアップに失敗しました" },
      { status: 500 }
    );
  }
}

