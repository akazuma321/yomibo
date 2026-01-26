"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  saved: number;
  read: number;
  readPercentage: number;
  weeklyActivity: Array<{
    day: string;
    saved: number;
    read: number;
  }>;
  tags: Array<{
    name: string;
    count: number;
  }>;
  recommendedTags: Array<{
    name: string;
    score: number;
    count: number;
    readCount: number;
    reason: string;
  }>;
}

interface WeeklyLearning {
  id: string;
  weekStart: string;
  summary: string;
  createdAt: string;
}

export default function InsightsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [weeklyLearning, setWeeklyLearning] = useState<WeeklyLearning | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tagging, setTagging] = useState(false);

  const fetchInsights = async (offset: number = weekOffset) => {
    setLoading(true);
    try {
      const [statsRes, insightsRes] = await Promise.all([
        fetch(`/api/insights/stats?weekOffset=${offset}`),
        fetch("/api/insights")
      ]);

      if (statsRes.status === 401 || insightsRes.status === 401) {
        router.push("/login?from=/insights");
        return;
      }

      const statsData = await statsRes.json();
      const insightsData = await insightsRes.json();

      if (!statsRes.ok) {
        throw new Error(statsData.error || "統計の取得に失敗しました");
      }
      if (!insightsRes.ok) {
        throw new Error(insightsData.error || "インサイトの取得に失敗しました");
      }

      setStats(statsData);
      // 今週のインサイト（最新の1件）
      if (insightsData.insights && insightsData.insights.length > 0) {
        setWeeklyLearning(insightsData.insights[0]);
      } else {
        setWeeklyLearning(null);
      }
    } catch (e: any) {
      setError(e.message ?? "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights(weekOffset);

    // ページがフォーカスされたときに再取得
    const handleFocus = () => {
      fetchInsights(weekOffset);
    };
    window.addEventListener("focus", handleFocus);

    // 定期的に更新（30秒ごと）
    const interval = setInterval(() => {
      fetchInsights(weekOffset);
    }, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [weekOffset]);

  const maxActivity = stats
    ? Math.max(
        1,
        ...stats.weeklyActivity.map((d) => Math.max(d.saved, d.read))
      )
    : 1;

  // タグをサイズ別に分類（上位6つを大きく、それ以外を小さく）
  const primaryTags = stats?.tags.slice(0, 6) ?? [];
  const secondaryTags = stats?.tags.slice(6) ?? [];
  const recommended = stats?.recommendedTags ?? [];

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-brand-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h2 className="text-sm font-semibold text-brand-500">YOUR INSIGHTS</h2>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">学びを可視化</h1>
        <p className="text-sm text-slate-600">
          保存した記事から興味・関心を分析します
        </p>
        {loading && <p className="text-xs text-slate-500">読み込み中...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </section>

      {/* 統計カード */}
      {stats && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="card-surface flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
              <svg
                className="h-6 w-6 text-brand-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">保存</p>
              <p className="text-2xl font-bold text-slate-900">{stats.saved}</p>
              <p className="text-xs text-slate-500">記事</p>
            </div>
          </div>

          <div className="card-surface flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">読了</p>
              <p className="text-2xl font-bold text-slate-900">{stats.read}</p>
              <p className="text-xs text-slate-500">記事</p>
            </div>
          </div>

          <div className="card-surface flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <svg
                className="h-6 w-6 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">読了率</p>
              <p className="text-2xl font-bold text-slate-900">{stats.readPercentage}%</p>
              <p className="text-xs text-slate-500">達成</p>
            </div>
          </div>
        </section>
      )}

      {/* 週の活動 */}
      {stats && (
        <section className="card-surface space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="text-sm font-semibold text-slate-900">
                {weekOffset === 0 ? "今週の活動" : weekOffset === 1 ? "先週の活動" : `${weekOffset}週間前の活動`}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                ←
              </button>
              <button
                onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                disabled={weekOffset === 0}
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-end gap-2" style={{ height: "120px" }}>
              {stats.weeklyActivity.map((day, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex flex-col items-center gap-0.5 w-full" style={{ height: "100px" }}>
                    <div
                      className="w-full bg-brand-500 rounded-t"
                      style={{
                        height: `${(day.saved / maxActivity) * 100}px`,
                        minHeight: day.saved > 0 ? "4px" : "0px"
                      }}
                    />
                    <div
                      className="w-full bg-emerald-500 rounded-t"
                      style={{
                        height: `${(day.read / maxActivity) * 100}px`,
                        minHeight: day.read > 0 ? "4px" : "0px"
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-brand-500"></div>
                <span className="text-slate-600">保存</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-emerald-500"></div>
                <span className="text-slate-600">読了</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 今週の学び */}
      <section className="card-surface space-y-4 p-5">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-slate-900">今週の学び</h3>
        </div>
        {weeklyLearning ? (
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
            {weeklyLearning.summary}
          </p>
        ) : (
          <div className="space-y-2 text-sm text-slate-500">
            <p>今週読んだ記事がありません</p>
            <p className="text-xs">
              記事を読了すると、AIが学習を分析します
            </p>
          </div>
        )}
      </section>

      {/* あなたの興味タグ */}
      {stats && (
        <section className="card-surface space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">あなたの興味タグ</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={tagging}
                onClick={async () => {
                  setTagging(true);
                  try {
                    // 1) まず変なタグを掃除
                    const cleanupRes = await fetch("/api/tags/cleanup", { method: "POST" });
                    if (cleanupRes.status === 401) {
                      router.push("/login?from=/insights");
                      return;
                    }
                    const cleanupData = await cleanupRes.json();
                    if (!cleanupRes.ok) {
                      throw new Error(cleanupData.error || "タグのクリーンアップに失敗しました");
                    }

                    // 2) 未タグ記事に再付与
                    const res = await fetch("/api/tags/auto", { method: "POST" });
                    if (res.status === 401) {
                      router.push("/login?from=/insights");
                      return;
                    }
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || "タグ付けに失敗しました");
                    }
                    await fetchInsights(weekOffset);
                  } catch (e: any) {
                    setError(e.message ?? "タグ処理に失敗しました");
                  } finally {
                    setTagging(false);
                  }
                }}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-brand-500 disabled:opacity-60"
                title="変なタグを掃除してから、未タグ記事に自動でタグを付け直します"
              >
                {tagging ? "処理中..." : "タグを整える"}
              </button>
              <button
                type="button"
                disabled={tagging}
                onClick={async () => {
                  setTagging(true);
                  try {
                    const res = await fetch("/api/tags/auto", { method: "POST" });
                    if (res.status === 401) {
                      router.push("/login?from=/insights");
                      return;
                    }
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || "タグ付けに失敗しました");
                    }
                    await fetchInsights(weekOffset);
                  } catch (e: any) {
                    setError(e.message ?? "タグ付けに失敗しました");
                  } finally {
                    setTagging(false);
                  }
                }}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-brand-500 disabled:opacity-60"
                title="タグが付いていない既存記事に対して、自動でタグを抽出します"
              >
                {tagging ? "処理中..." : "未タグ記事に自動付与"}
              </button>
            </div>
          </div>
          {stats.tags.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-1 font-medium text-slate-900">まだタグがありません</p>
              <p className="text-xs">
                右上の「未タグ記事に自動付与」を押すと、登録済み記事からタグ/ハッシュタグを抽出して表示します。
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {primaryTags.map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => router.push(`/articles?tag=${encodeURIComponent(tag.name)}`)}
                    className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100"
                    title={`${tag.count}件`}
                  >
                    #{tag.name}
                  </button>
                ))}
                {secondaryTags.map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => router.push(`/articles?tag=${encodeURIComponent(tag.name)}`)}
                    className="rounded-full bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                    title={`${tag.count}件`}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                ※タグをクリックで、関連記事で絞り込みできます
              </p>
            </>
          )}
        </section>
      )}

      {/* 推定: 興味が高そうなタグ */}
      {recommended.length > 0 && (
        <section className="card-surface space-y-4 p-5">
          <h3 className="text-sm font-semibold text-slate-900">推定：いま興味が高そうなタグ</h3>
          <div className="flex flex-wrap gap-2">
            {recommended.map((t) => (
              <button
                key={t.name}
                onClick={() => router.push(`/articles?tag=${encodeURIComponent(t.name)}`)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-brand-400"
                title={t.reason ? `${t.reason}（score=${t.score}）` : `score=${t.score}`}
              >
                #{t.name}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            ※ 频出/読了/直近の加重からスコアリングしています（クリックで記事一覧を絞り込み）
          </p>
        </section>
      )}
    </div>
  );
}
