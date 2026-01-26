"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function InviteClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/signup";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-slate-900">招待コード</h1>
        <p className="text-sm text-slate-600">
          はじめての利用時だけ、招待コードの入力が必要です。
        </p>
      </div>

      <form
        className="card-surface space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          try {
            const res = await fetch("/api/invite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code })
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data?.error || "招待コードが違います");
              return;
            }
            router.push(next);
            router.refresh();
          } catch (e) {
            console.error(e);
            setError("招待コードの確認に失敗しました");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">招待コード</span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="例: YOMIBO-XXXX"
            required
          />
        </label>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-500/30 hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "確認中..." : "続ける"}
        </button>

        <p className="text-center text-xs text-slate-600">
          すでにアカウントがありますか？{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            ログイン
          </Link>
        </p>
      </form>
    </div>
  );
}
