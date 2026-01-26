"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/articles";
  const authError = searchParams.get("error");

  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const providers = await getProviders();
        setGoogleEnabled(Boolean(providers?.google));
      } catch (e) {
        // AUTH_SECRET 未設定などで /api/auth/providers が落ちるケースがあるので黙って隠す
        setGoogleEnabled(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!authError) return;
    if (authError === "AccessDenied") {
      setError("招待コードを入力してください（初回のみ）");
      return;
    }
    if (authError === "OAuthAccountNotLinked") {
      setError("このメールアドレスは別の方法で登録されています。別の方法でログインしてください。");
      return;
    }
    // その他は汎用メッセージ
    setError("ログインに失敗しました。しばらくしてからお試しください。");
  }, [authError]);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-slate-900">ログイン</h1>
        <p className="text-sm text-slate-600">
          メールアドレスとパスワードでログインします。
        </p>
        <p className="text-xs text-slate-500">
          はじめての方は{" "}
          <Link
            href={`/invite?next=${encodeURIComponent("/signup")}`}
            className="font-medium text-brand-700 hover:underline"
          >
            招待コードを入力
          </Link>{" "}
          してから登録してください。
        </p>
      </div>

      <form
        className="card-surface space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          try {
            const res = await signIn("credentials", {
              email,
              password,
              redirect: false
            });
            if (res?.error) {
              setError("メールアドレスまたはパスワードが違います");
              return;
            }
            router.push(from);
            router.refresh();
          } catch (e) {
            console.error(e);
            setError("ログインに失敗しました");
          } finally {
            setLoading(false);
          }
        }}
      >
        {googleEnabled && (
          <>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: from })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-800 hover:border-brand-500"
            >
              <span className="text-base">G</span>
              Googleで登録/ログイン
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] text-slate-500">または</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">
            メールアドレス
          </span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">
            パスワード
          </span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? "ログイン中..." : "ログインする"}
        </button>

        <p className="text-center text-xs text-slate-600">
          はじめてですか？{" "}
          <Link href="/signup" className="font-medium text-brand-700 hover:underline">
            新規登録
          </Link>
        </p>
      </form>
    </div>
  );
}

