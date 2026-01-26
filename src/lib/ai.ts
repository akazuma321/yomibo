import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const embeddingModel =
  process.env.LORELOG_EMBED_MODEL || "text-embedding-3-small";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!apiKey) return null;
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function createEmbedding(input: string): Promise<number[] | null> {
  const c = getClient();
  if (!c) return null;

  const res = await c.embeddings.create({
    model: embeddingModel,
    input
  });

  const vector = res.data[0]?.embedding;
  return vector ?? null;
}

export async function generateWeeklyInsightSummary(
  bulletSummary: string
): Promise<string | null> {
  const c = getClient();
  if (!c) return null;

  const res = await c.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "あなたは読書ログサービスのインサイトライターです。与えられた箇条書きの要約をもとに、その週の学びや関心の傾向を日本語で3〜4行程度にまとめてください。硬すぎず、しかしビジネス文書として読めるトーンで書いてください。"
      },
      {
        role: "user",
        content: bulletSummary
      }
    ]
  });

  const text = res.choices[0]?.message?.content;
  if (!text || typeof text !== "string") return null;
  return text.trim();
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function parseEmbedding(json: string | null): number[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json) as number[];
    if (!Array.isArray(arr)) return null;
    return arr.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  } catch {
    return null;
  }
}

