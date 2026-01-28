import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function HeaderAuthButton() {
  const session = await auth();
  const user = session?.user as any | undefined;
  const label = user?.name || user?.email || "メニュー";

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[220px] truncate text-xs text-slate-600 md:inline">
          {label}
        </span>
        <Link
          href="/pricing"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-800 hover:border-brand-500"
        >
          開発者を応援
        </Link>
        <Link
          href="/settings"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-800 hover:border-brand-500"
        >
          設定
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-rose-50 px-4 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            ログアウト
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/pricing"
        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-800 hover:border-brand-500"
      >
        開発者を応援
      </Link>
      <Link
        href="/login"
        className="inline-flex items-center rounded-full bg-brand-500 px-4 py-1.5 text-xs font-medium text-white shadow-md shadow-brand-500/25 hover:bg-brand-600"
      >
        ログイン
      </Link>
    </div>
  );
}

