import type { PrismaClient } from "@prisma/client";

export async function mergeTagsToArticle(
  prisma: PrismaClient,
  opts: { articleId: string; tagNames: string[] }
): Promise<{ added: number; total: number }> {
  const { articleId, tagNames } = opts;

  const unique = Array.from(new Set(tagNames.map((t) => t.trim()).filter(Boolean)));
  if (unique.length === 0) {
    const current = await prisma.articleTag.count({ where: { articleId } });
    return { added: 0, total: current };
  }

  const existing = await prisma.articleTag.findMany({
    where: { articleId },
    include: { tag: true }
  });
  const existingNames = new Set(existing.map((at) => at.tag.name));

  const toAdd = unique.filter((t) => !existingNames.has(t));
  if (toAdd.length === 0) return { added: 0, total: existing.length };

  const tagIds: string[] = [];
  for (const name of toAdd) {
    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {}
    });
    tagIds.push(tag.id);
  }

  // NOTE: SQLite では createMany.skipDuplicates が未対応。
  // 事前に existing を除外しているので、通常は重複しない。
  // それでも競合が起きた場合(P2002)に備えてフォールバックする。
  try {
    await prisma.articleTag.createMany({
      data: tagIds.map((tagId) => ({ articleId, tagId }))
    });
  } catch (e: any) {
    // 最悪ケース: 個別に作ってユニーク衝突は無視
    for (const tagId of tagIds) {
      try {
        await prisma.articleTag.create({ data: { articleId, tagId } });
      } catch (inner: any) {
        if (inner?.code === "P2002") continue;
        throw inner;
      }
    }
  }

  const total = await prisma.articleTag.count({ where: { articleId } });
  return { added: toAdd.length, total };
}

