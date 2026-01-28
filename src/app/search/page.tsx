"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Article {
  id: string;
  url: string;
  title: string;
  summary?: string | null;
  bodyLength?: number | null;
  readAt?: string | null;
  createdAt: string;
  tags?: string[];
  _enriching?: boolean;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [urlSaving, setUrlSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbMode, setDbMode] = useState<"db" | "fallback" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // 初期表示で最近の読了記事を取得
    (async () => {
      try {
        const res = await fetch("/api/articles");
        if (res.status === 401) {
          router.push("/login?from=/search");
          return;
        }
        // サーバがDBに繋げていない場合でも、フォールバックはJSONで返す想定
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("APIがJSONを返していません。データベースが初期化されていない可能性があります。");
          return;
        }
        const data = await res.json();
        if (data?.storage === "db") setDbMode("db");
        if (data?.storage === "fallback") setDbMode("fallback");
        setResults(data.articles ?? []);
      } catch (e) {
        console.error("記事取得エラー:", e);
      }
    })();
  }, []);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      if (res.status === 401) {
        router.push("/login?from=/search");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "検索に失敗しました");
      }
      setResults(data.articles ?? []);
    } catch (e: any) {
      setError(e.message ?? "検索に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitUrl = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    let url = String(formData.get("url") || "").trim();
    if (!url) return;

    // プロトコルがない場合は自動で https:// を付与（youtube.com などを許容）
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    setUrlSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode: "fast" })
      });
      if (res.status === 401) {
        router.push("/login?from=/search");
        return;
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`サーバーエラー: ${res.status} ${res.statusText}. データベースが初期化されていない可能性があります。`);
      }
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "保存に失敗しました");
      }
      const created: Article = { ...(data.article as Article), _enriching: true };
      setResults((prev) => [created, ...prev]);
      if (formRef.current) {
        formRef.current.reset();
      }

      // 重い処理（タイトル/要約/埋め込み/タグ付け）は後で回す
      // UIはブロックせず、完了したら該当記事だけ更新する
      fetch(`/api/articles/${encodeURIComponent(created.id)}/update-title`, {
        method: "POST"
      })
        .then(async (r) => {
          const json = await r.json().catch(() => null);
          if (!r.ok || !json?.article) return;
          const updated = json.article as Article;
          setResults((prev) =>
            prev.map((a) =>
              a.id === created.id ? { ...updated, _enriching: false } : a
            )
          );
        })
        .catch((err) => {
          console.error("背景解析に失敗:", err);
          setResults((prev) =>
            prev.map((a) => (a.id === created.id ? { ...a, _enriching: false } : a))
          );
        });
    } catch (e: any) {
      console.error("URL追加エラー:", e);
      setError(e.message ?? "保存に失敗しました。データベースが初期化されているか確認してください。");
    } finally {
      setUrlSaving(false);
    }
  };

  const onMarkRead = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${id}/read`, {
        method: "POST"
      });
      if (res.status === 401) {
        router.push("/login?from=/search");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "更新に失敗しました");
      }
      setResults((prev) =>
        prev.map((a) => (a.id === id ? { ...a, readAt: data.article.readAt } : a))
      );
    } catch (e: any) {
      setError(e.message ?? "更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">検索 & 登録</h1>
        <p className="text-xs text-slate-700">
          読みたい / 読んだ記事の URL を投げて、読了ログとセマンティック検索に活用します。
        </p>
        {dbMode === "fallback" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            いまは <b>DATABASE_URL が未設定</b>のため、記事はローカル保存（開発用）で動いています。
            本番運用する場合は `.env.local` に `DATABASE_URL` を設定してください。
          </div>
        )}
        <form
          ref={formRef}
          onSubmit={onSubmitUrl}
          className="card-surface flex flex-col gap-3 p-4 text-xs md:flex-row md:items-center"
        >
          <input
            name="url"
            type="text"
            placeholder="https://example.com/... または youtube.com/..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600"
          >
            URL を追加
          </button>
        </form>
        <form
          onSubmit={onSearch}
          className="card-surface flex items-center gap-3 p-4 text-xs"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: 最近読んだテスト駆動開発のやつ"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-100 hover:border-emerald-500"
          >
            検索
          </button>
        </form>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>結果</span>
          {(loading || urlSaving) && <span>処理中...</span>}
        </div>
        <div className="space-y-3">
          {results.map((article) => (
            <article
              key={article.id}
              className="card-surface flex flex-col gap-2 p-4 text-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-slate-900 hover:text-emerald-600"
                >
                  {article.title || article.url}
                </a>
                <div className="flex items-center gap-2">
                  {article._enriching && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
                      解析中...
                    </span>
                  )}
                  {article.tags && article.tags.length > 0 && (
                    <div className="hidden max-w-[55%] flex-wrap justify-end gap-1 md:flex">
                      {article.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => onMarkRead(article.id)}
                    className="pill whitespace-nowrap border-emerald-500/40 bg-emerald-50 text-emerald-700"
                  >
                    {article.readAt ? "読了済" : "読了"}
                  </button>
                </div>
              </div>
              {article.summary && (
                <p className="line-clamp-2 text-slate-700">{article.summary}</p>
              )}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 md:hidden">
                  {article.tags.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                追加: {new Date(article.createdAt).toLocaleString("ja-JP")}
              </p>
            </article>
          ))}
          {results.length === 0 && (
            <p className="text-xs text-slate-500">
              まだ記事が登録されていません。まずは URL を 1 件追加してみましょう。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

