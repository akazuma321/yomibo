"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Article {
  id: string;
  url: string;
  title: string;
  summary?: string | null;
  bodyLength?: number | null;
  readAt?: string | null;
  createdAt: string;
  tags: string[];
}

export default function ArticlesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTag = searchParams.get("tag");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/articles");
        if (res.status === 401) {
          router.push("/login?from=/articles");
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "記事の取得に失敗しました");
        }
        const fetchedArticles = data.articles ?? [];
        
        // 未読記事を上に、その後時系列でソート
        const sortedArticles = [...fetchedArticles].sort((a, b) => {
          const aIsRead = !!a.readAt;
          const bIsRead = !!b.readAt;
          
          // 未読記事を優先
          if (!aIsRead && bIsRead) return -1;
          if (aIsRead && !bIsRead) return 1;
          
          // 同じ状態（両方未読 or 両方読了）の場合は時系列でソート（新しい順）
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return bDate - aDate;
        });
        
        setArticles(sortedArticles);

        // タイトルがURLのまま、またはbodyLengthが未取得の記事を自動で更新
        const articlesToUpdate = fetchedArticles.filter(
          (a: Article) =>
            !a.title ||
            a.title === a.url ||
            a.title.startsWith("http") ||
            a.title === a.url.replace(/^https?:\/\//, "").replace(/\/$/, "") ||
            !a.bodyLength ||
            a.bodyLength === 0
        );

        for (const article of articlesToUpdate) {
          try {
            const updateRes = await fetch(`/api/articles/${article.id}/update-title`, {
              method: "POST"
            });
            if (updateRes.status === 401) {
              router.push("/login?from=/articles");
              return;
            }
            if (updateRes.ok) {
              const updateData = await updateRes.json();
              setArticles((prev) => {
                const updated = prev.map((a) => (a.id === article.id ? updateData.article : a));
                // 未読記事を上に、その後時系列でソート
                return updated.sort((a, b) => {
                  const aIsRead = !!a.readAt;
                  const bIsRead = !!b.readAt;
                  
                  // 未読記事を優先
                  if (!aIsRead && bIsRead) return -1;
                  if (aIsRead && !bIsRead) return 1;
                  
                  // 同じ状態（両方未読 or 両方読了）の場合は時系列でソート（新しい順）
                  const aDate = new Date(a.createdAt).getTime();
                  const bDate = new Date(b.createdAt).getTime();
                  return bDate - aDate;
                });
              });
            }
          } catch (e) {
            console.error("Failed to update title for article:", article.id, e);
          }
        }
      } catch (e: any) {
        setError(e.message ?? "記事の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const visibleArticles = selectedTag
    ? articles.filter((a) => (a.tags ?? []).includes(selectedTag))
    : articles;
  const unreadCount = visibleArticles.filter((a) => !a.readAt).length;

  const onMarkRead = async (id: string) => {
    try {
      const res = await fetch(`/api/articles/${id}/read`, {
        method: "POST"
      });
      if (res.status === 401) {
        router.push("/login?from=/articles");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "更新に失敗しました");
      }
      setArticles((prev) => {
        const updated = prev.map((a) => (a.id === id ? { ...a, readAt: data.article.readAt } : a));
        // 未読記事を上に、その後時系列でソート
        return updated.sort((a, b) => {
          const aIsRead = !!a.readAt;
          const bIsRead = !!b.readAt;
          
          // 未読記事を優先
          if (!aIsRead && bIsRead) return -1;
          if (aIsRead && !bIsRead) return 1;
          
          // 同じ状態（両方未読 or 両方読了）の場合は時系列でソート（新しい順）
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return bDate - aDate;
        });
      });
    } catch (e: any) {
      console.error("読了更新エラー:", e);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("この記事を削除しますか？")) return;
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "DELETE"
      });
      if (res.status === 401) {
        router.push("/login?from=/articles");
        return;
      }
      if (!res.ok) {
        throw new Error("削除に失敗しました");
      }
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      console.error("削除エラー:", e);
      alert("削除に失敗しました");
    }
  };

  const getContentType = (url: string): { type: string; icon: string } => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return { type: "動画", icon: "▶" };
    }
    return { type: "記事", icon: "📄" };
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return "1時間未満";
    } else if (diffHours < 24) {
      return `${diffHours}時間前に追加しました`;
    } else if (diffDays === 1) {
      return "1日前に追加しました";
    } else {
      return `${diffDays}日前に追加しました`;
    }
  };

  const estimateReadTime = (title: string, bodyLength?: number | null, summary?: string | null): string => {
    // 本文の文字数が取得できている場合は、それを優先して使用
    if (bodyLength && bodyLength > 0) {
      // CuraQと同様の精度を目指す計算式
      // 日本語の読書速度: 1分あたり400文字（一般的な読書速度）
      // 計算式: 文字数 ÷ 読書速度（文字/分）
      const minutes = Math.max(1, Math.ceil(bodyLength / 400));
      return `${minutes} min read`;
    }
    
    // bodyLengthがない場合は、タイトルとsummaryから推定
    const titleLength = title ? title.length : 0;
    const summaryLength = summary ? summary.length : 0;
    
    if (titleLength === 0 && summaryLength === 0) {
      return "5 min read"; // デフォルト値
    }
    
    // summaryは要約なので、実際の本文より短い
    // summaryの文字数を4倍して本文の長さを推定（より正確に）
    // タイトルは短いので、0.5倍で重み付け
    const estimatedBodyLength = summaryLength * 4 + titleLength * 0.5;
    const minutes = Math.max(1, Math.ceil(estimatedBodyLength / 400));
    return `${minutes} min read`;
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-slate-900">
            未読記事 {unreadCount}件
          </h1>
          {selectedTag && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                絞り込み: #{selectedTag}
              </span>
              <button
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-brand-500"
                onClick={() => router.push("/articles")}
              >
                解除
              </button>
            </div>
          )}
        </div>
        {loading && <p className="text-xs text-slate-500">読み込み中...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </section>

      <section className="space-y-4">
        {visibleArticles.length === 0 ? (
          <div className="card-surface p-8 text-center">
            <p className="text-slate-500">
              {selectedTag
                ? `#${selectedTag} の記事が見つかりませんでした。`
                : "まだ記事が登録されていません。"}
            </p>
          </div>
        ) : (
          visibleArticles.map((article) => {
            const contentType = getContentType(article.url);
            const isRead = !!article.readAt;
            // タイトルがURLと異なる場合はタイトルを表示、同じ場合はURLからドメイン名を抽出
            const displayTitle =
              article.title &&
              article.title !== article.url &&
              !article.title.startsWith("http")
                ? article.title
                : article.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

            return (
              <article
                key={article.id}
                className="card-surface flex flex-col gap-3 p-5 text-sm"
              >
                {/* コンテンツタイプ（左）/ タグ（右） */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>{contentType.icon}</span>
                    <span>{contentType.type}</span>
                  </div>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex max-w-[70%] flex-wrap justify-end gap-1.5">
                      {article.tags.slice(0, 6).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => router.push(`/articles?tag=${encodeURIComponent(tag)}`)}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                          title={`#${tag} で絞り込み`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* タイトル */}
                <h2 className="text-base font-semibold text-slate-900 line-clamp-2">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-brand-500"
                  >
                    {displayTitle}
                  </a>
                </h2>

                {/* メタデータ */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>想定所要時間: {estimateReadTime(article.title, article.bodyLength, article.summary)}</span>
                  <span>•</span>
                  <span className="text-slate-400">追加: {formatTimeAgo(article.createdAt)}</span>
                </div>

                {/* 説明文 */}
                {article.summary && (
                  <p className="text-sm leading-relaxed text-slate-700 line-clamp-2">
                    {article.summary}
                  </p>
                )}

                {/* アクションボタン */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => onMarkRead(article.id)}
                    className={`rounded-lg border px-4 py-2 text-xs font-medium text-white transition-colors ${
                      isRead
                        ? "border-emerald-500 bg-emerald-500 hover:bg-emerald-600"
                        : "border-brand-500 bg-brand-500 hover:bg-brand-600"
                    }`}
                  >
                    {isRead ? "読了済" : "読了"}
                  </button>
                  <button
                    onClick={() => onDelete(article.id)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
