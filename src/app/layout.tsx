import type { Metadata } from "next";
import Link from "next/link";
import BottomNavigation from "@/components/BottomNavigation";
import HeaderAuthButton from "@/components/HeaderAuthButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "YOMIBO - 「あとで読む」を資産に変える。",
  description: "YOMIBO は、読んだ記事を自動整理し、検索とインサイトであなたの学びを資産に変える個人用ナレッジ・リーディングログです。"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-brand-50 text-slate-900 antialiased">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-0 pt-6 md:px-6 lg:px-8">
          <header className="flex items-center justify-between pb-8">
            <Link href="/" className="flex items-center gap-2">
              <div>
                <div className="inline-block rounded bg-brand-500 px-4 py-1.5 text-xl font-black tracking-tight text-white shadow-md md:text-2xl">
                  YOMIBO
                </div>
                <div className="text-[10px] text-slate-500 md:text-xs">
                  「あとで読む」を資産に変える、個人用ナレッジログ
                </div>
              </div>
            </Link>
            <HeaderAuthButton />
          </header>
          <main className="flex-1 pb-40">{children}</main>
        </div>

        {/* ページ下部のシンプルなナビゲーション */}
        <BottomNavigation />

        <footer className="fixed bottom-[60px] left-0 right-0 z-40 w-full bg-brand-50 py-6 text-xs text-slate-500">
          <div className="mx-auto max-w-5xl px-4 md:flex md:items-center md:justify-between md:px-6 lg:px-8">
            <p className="mb-3 md:mb-0">&quot;Game Change through AI-Native Agility&quot;</p>
            <div />
          </div>
        </footer>
      </body>
    </html>
  );
}

