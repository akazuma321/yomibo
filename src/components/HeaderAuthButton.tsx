"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

export default function HeaderAuthButton() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // hooksは条件分岐の内側で呼ばない（renderごとにhooks数が変わるとクラッシュする）
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, status]);

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  if (status === "authenticated") {
    const label = session?.user?.name || session?.user?.email || "メニュー";

    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-800 hover:border-brand-500"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="max-w-[140px] truncate">{label}</span>
          <span className="text-[10px] text-slate-500">▼</span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            <Link
              role="menuitem"
              href="/pricing"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
            >
              開発者を応援
            </Link>
            <Link
              role="menuitem"
              href="/settings"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
            >
              設定
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
            >
              ログアウト
            </button>
          </div>
        )}
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

