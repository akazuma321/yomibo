import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export type FallbackArticle = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  url: string;
  title: string;
  summary: string | null;
  bodyLength: number | null;
  embedding: string | null;
  tags: string[];
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoreShape = {
  version: 1;
  articles: FallbackArticle[];
};

function storePath() {
  return path.join(process.cwd(), ".local-data", "articles.json");
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      version: 1,
      articles: Array.isArray(parsed.articles)
        ? (parsed.articles as any[]).map((a) => ({
            userEmail: null,
            userName: null,
            ...a
          }))
        : []
    };
  } catch (e: any) {
    if (e?.code === "ENOENT") return { version: 1, articles: [] };
    throw e;
  }
}

async function writeStore(next: StoreShape) {
  const dir = path.dirname(storePath());
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${storePath()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, storePath());
}

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");
}

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim());
}

export function shouldUseFallbackStore() {
  // 本番はDB未設定を許容しない（静かにローカル保存に落ちると事故るため）
  if (process.env.NODE_ENV === "production") return false;
  return !isDbConfigured();
}

export async function listArticlesForUser(userId: string, take = 50) {
  const store = await readStore();
  return store.articles
    .filter((a) => a.userId === userId)
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, take);
}

export async function createArticleForUser(
  userId: string,
  data: Omit<FallbackArticle, "id" | "userId" | "createdAt" | "updatedAt">
) {
  const store = await readStore();
  const t = nowIso();
  const article: FallbackArticle = {
    id: newId(),
    userId,
    createdAt: t,
    updatedAt: t,
    ...data
  };
  store.articles.unshift(article);
  await writeStore(store);
  return article;
}

export async function updateArticleForUser(
  userId: string,
  id: string,
  patch: Partial<Omit<FallbackArticle, "id" | "userId" | "createdAt">>
) {
  const store = await readStore();
  const idx = store.articles.findIndex((a) => a.userId === userId && a.id === id);
  if (idx === -1) return null;
  const current = store.articles[idx]!;
  const next: FallbackArticle = {
    ...current,
    ...patch,
    updatedAt: nowIso()
  };
  store.articles[idx] = next;
  await writeStore(store);
  return next;
}

export async function deleteArticleForUser(userId: string, id: string) {
  const store = await readStore();
  const before = store.articles.length;
  store.articles = store.articles.filter((a) => !(a.userId === userId && a.id === id));
  const deleted = store.articles.length !== before;
  if (deleted) await writeStore(store);
  return deleted;
}

export async function searchArticlesForUser(userId: string, query: string, take = 50) {
  const q = query.toLowerCase();
  const all = await listArticlesForUser(userId, 1000);
  return all
    .filter((a) => {
      const title = (a.title ?? "").toLowerCase();
      const url = (a.url ?? "").toLowerCase();
      const summary = (a.summary ?? "").toLowerCase();
      const tags = (a.tags ?? []).join(" ").toLowerCase();
      return (
        title.includes(q) || url.includes(q) || summary.includes(q) || tags.includes(q)
      );
    })
    .slice(0, take);
}

