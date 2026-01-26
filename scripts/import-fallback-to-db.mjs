import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

/**
 * ローカル保存(.local-data/articles.json) → Postgres(DB)へ移行するワンショットスクリプト
 *
 * 使い方:
 *   DATABASE_URL="postgresql://..." node scripts/import-fallback-to-db.mjs
 *
 * 注意:
 * - User は email をキーに作成/取得します（ローカル保存に email が無い場合はスキップ）
 * - Tag/ArticleTag も作成します（重複は避けます）
 */

const STORE_PATH = path.join(process.cwd(), ".local-data", "articles.json");

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL が未設定です（Postgresの接続文字列を設定してください）");
  }

  const prisma = new PrismaClient();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  const store = JSON.parse(raw);
  const articles = Array.isArray(store?.articles) ? store.articles : [];

  let imported = 0;
  let skipped = 0;

  for (const a of articles) {
    const url = String(a?.url ?? "").trim();
    const title = String(a?.title ?? "").trim();
    const userEmail = String(a?.userEmail ?? "").trim().toLowerCase();
    const userName = a?.userName ? String(a.userName).trim() : null;
    const tags = Array.isArray(a?.tags) ? a.tags.map((t) => String(t).trim()).filter(Boolean) : [];
    const summary = a?.summary == null ? null : String(a.summary);
    const bodyLength = a?.bodyLength == null ? null : Number(a.bodyLength);
    const embedding = a?.embedding == null ? null : String(a.embedding);
    const readAt = a?.readAt ? new Date(String(a.readAt)) : null;
    const createdAt = a?.createdAt ? new Date(String(a.createdAt)) : new Date();

    if (!url || !title || !userEmail) {
      skipped++;
      continue;
    }

    const dbUser = await prisma.user.upsert({
      where: { email: userEmail },
      create: {
        email: userEmail,
        name: userName,
        inviteAcceptedAt: new Date()
      },
      update: {
        name: userName ?? undefined
      }
    });

    // 既に同じURLがあればスキップ（重複投入防止）
    const existing = await prisma.article.findFirst({
      where: { userId: dbUser.id, url }
    });
    if (existing) {
      skipped++;
      continue;
    }

    const created = await prisma.article.create({
      data: {
        userId: dbUser.id,
        url,
        title,
        summary,
        bodyLength: Number.isFinite(bodyLength) ? bodyLength : null,
        embedding,
        readAt,
        createdAt
      }
    });

    for (const t of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: t },
        create: { name: t },
        update: {}
      });
      // ArticleTagは複合PKなので、既にあると例外。安全に握りつぶす。
      try {
        await prisma.articleTag.create({
          data: { articleId: created.id, tagId: tag.id }
        });
      } catch {
        // ignore duplicates
      }
    }

    imported++;
  }

  await prisma.$disconnect();
  console.log(`done: imported=${imported} skipped=${skipped}`);
  console.log("NOTE: userEmail が無い古いローカル記事はスキップされます。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

