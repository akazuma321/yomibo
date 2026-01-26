import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface Params {
  params: {
    id: string;
  };
}

export async function DELETE(_req: NextRequest, { params }: Params) {
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

    const deleted = await prisma.article.deleteMany({
      where: { id, userId }
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/articles/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "記事の削除に失敗しました" },
      { status: 500 }
    );
  }
}
