export function normalizeTag(raw: string): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;

  // 先頭の # / 全角＃ を除去
  s = s.replace(/^[#＃]+/u, "");
  // 末尾の記号を軽く除去
  s = s.replace(/[#＃]+$/u, "");
  s = s.trim();
  if (!s) return null;

  // 許容文字以外を除去（日本語/英数字/一部記号）
  // - 日本語: ひらがな/カタカナ/漢字/長音/々
  // - 英数字: A-Z a-z 0-9
  // - 記号: _ -
  s = s.replace(/[^\p{L}\p{N}_\-ー々]/gu, "");

  // 英字が含まれる場合は小文字化（日本語はそのまま）
  if (/[A-Za-z]/.test(s)) s = s.toLowerCase();

  // 長すぎ/短すぎは捨てる
  if (s.length < 2) return null;
  if (s.length > 40) s = s.slice(0, 40);

  // よくあるノイズ
  const stop = new Set([
    "note",
    "qiita",
    "zenn",
    "github",
    "youtube",
    "www",
    "com",
    "jp",
    "html",
    "https",
    "http"
  ]);
  if (stop.has(s)) return null;

  return s;
}

export function isNoisyTag(name: string): boolean {
  const n = normalizeTag(name);
  if (!n) return true;

  // 数字だけ/短すぎ
  if (/^\d+$/u.test(n)) return true;
  if (n.length < 2) return true;

  // 記号が多い/URLっぽい
  if (/[\/:]/.test(name)) return true;

  // ありがちな汎用語（日本語）
  const jpStop = new Set([
    "入門",
    "方法",
    "完全",
    "解説",
    "まとめ",
    "実装",
    "設定",
    "比較",
    "紹介",
    "最新",
    "初心者",
    "勉強",
    "学習",
    "記事",
    "自分",
    "未来",
    "会社",
    "仕事"
  ]);
  if (jpStop.has(n)) return true;

  // ありがちな汎用語（カタカナ）
  const kataStop = new Set([
    "プロダクト",
    "アーキテクチャ",
    "テクノロジー",
    "コンテンツ",
    "マーケティング",
    "キャリア",
    "リーダーシップ",
    "ミーティング"
  ]);
  if (kataStop.has(n)) return true;

  return false;
}

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  // 日本語/英数字/記号をそこそこ許容
  const re = /[#＃]([\p{L}\p{N}_\-ー々]{2,40})/gu;
  const out: string[] = [];
  for (const m of text.matchAll(re)) {
    const n = normalizeTag(m[1] ?? "");
    if (n) out.push(n);
  }
  return out;
}

export function extractKeywordTags(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];

  // CuraQ寄せ: ハッシュタグ以外は「技術っぽい」もの中心に絞る
  const allowExact = new Set([
    "ai",
    "ml",
    "llm",
    "nlp",
    "rag",
    "gpt",
    "openai",
    "langchain",
    "nextjs",
    "next-auth",
    "nextauth",
    "prisma",
    "typescript",
    "javascript",
    "react",
    "node",
    "sql",
    "postgres",
    "sqlite",
    "docker",
    "kubernetes",
    "aws",
    "gcp",
    "azure"
  ]);

  // 英単語・技術ワード
  const en = /[A-Za-z][A-Za-z0-9+._-]{2,40}/g;
  for (const m of text.matchAll(en)) {
    const raw = String(m[0] ?? "");
    const n = normalizeTag(raw);
    if (!n) continue;
    if (allowExact.has(n)) {
      out.push(n);
      continue;
    }
    // "next-auth" みたいな連結や "gpt-4" のような形を許可
    if (/^(gpt|claude|gemini)[-_]?\d+/i.test(raw)) out.push(n);
    if (/(ai|llm|rag|auth|oauth|prisma|react|next)/i.test(raw)) out.push(n);
  }

  // カタカナ（例: プロダクト、アーキテクチャ）
  const kata = /[ァ-ヶー]{4,20}/g;
  for (const m of text.matchAll(kata)) {
    const n = normalizeTag(m[0] ?? "");
    if (n) out.push(n);
  }

  return Array.from(
    new Set(out.filter((t) => !isNoisyTag(t)))
  );
}

export function extractArticleTags(input: {
  title: string;
  summary?: string | null;
  url: string;
}): string[] {
  const parts = [
    input.title ?? "",
    input.summary ?? ""
  ].filter(Boolean);
  const text = parts.join(" ");

  const tags = [
    ...extractHashtags(text),
    ...extractKeywordTags(text)
  ];

  // 多すぎるとノイズなので上限
  return Array.from(new Set(tags)).filter((t) => !isNoisyTag(t)).slice(0, 20);
}

