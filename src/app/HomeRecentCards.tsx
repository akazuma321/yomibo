"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Article {
  id: string;
  url: string;
  title: string;
  summary?: string | null;
  readAt?: string | null;
  createdAt: string;
  tags: string[];
}

export default function HomeRecentCards() {
  const { status } = useSession();
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [recentReadArticles, setRecentReadArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (status !== "authenticated") {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/articles");
        const data = await res.json();
        if (res.ok && data.articles) {
          const unread = (data.articles as Article[]).filter((a) => !a.readAt).slice(0, 2);
          const read = (data.articles as Article[]).filter((a) => a.readAt).slice(0, 2);
          setRecentArticles(unread);
          setRecentReadArticles(read);
        }
      } catch (e) {
        console.error("Failed to fetch articles:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const AuthPrompt = ({ label }: { label: string }) => (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-600">
      <p className="mb-2 text-xs">{label}</p>
      <div className="flex gap-2">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full bg-brand-500 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-brand-600"
        >
          ログイン
        </Link>
        <Link
          href="/invite?next=/signup"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-800 hover:border-brand-500"
        >
          新規登録
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 最新の保存ログ */}
      <div className="card-surface relative overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
          <span>最新の保存ログ</span>
          <span>{recentArticles.length}件</span>
        </div>
        <div className="space-y-3 text-xs">
          {status !== "authenticated" ? (
            <AuthPrompt label="ログインすると保存ログが表示されます。" />
          ) : loading ? (
            <div className="text-slate-500">読み込み中...</div>
          ) : recentArticles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-600">
              <p className="mb-2 text-xs">まだ保存された記事がありません。</p>
              <p className="text-[11px] text-slate-500">
                URLを追加して、あなた専用のナレッジマップを育てましょう。
              </p>
            </div>
          ) : (
            recentArticles.map((article) => (
              <div
                key={article.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium text-slate-900 hover:text-brand-500"
                  >
                    {article.title || article.url}
                  </a>
                  {article.tags && article.tags.length > 0 && (
                    <span className="pill border-none bg-emerald-50 text-emerald-700">
                      {article.tags[0]}
                    </span>
                  )}
                </div>
                {article.summary && <p className="line-clamp-2 text-slate-700">{article.summary}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 最新の読了ログ */}
      <div className="card-surface relative overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
          <span>最新の読了ログ</span>
          <span>{recentReadArticles.length}件</span>
        </div>
        <div className="space-y-3 text-xs">
          {status !== "authenticated" ? (
            <AuthPrompt label="ログインすると読了ログが表示されます。" />
          ) : loading ? (
            <div className="text-slate-500">読み込み中...</div>
          ) : recentReadArticles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-600">
              <p className="mb-2 text-xs">まだ読了した記事がありません。</p>
              <p className="text-[11px] text-slate-500">
                記事を読んで「読了」ボタンを押すと、ここに表示されます。
              </p>
            </div>
          ) : (
            recentReadArticles.map((article) => (
              <div
                key={article.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium text-slate-900 hover:text-brand-500"
                  >
                    {article.title || article.url}
                  </a>
                  {article.tags && article.tags.length > 0 && (
                    <span className="pill border-none bg-emerald-50 text-emerald-700">
                      {article.tags[0]}
                    </span>
                  )}
                </div>
                {article.summary && <p className="line-clamp-2 text-slate-700">{article.summary}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

