import Link from "next/link";
import { Suspense } from "react";
import HomeRecentCards from "./HomeRecentCards";

export default function HomePage() {
  return (
    <div className="space-y-20 md:space-y-28">
      <section className="animate-fade-up pt-3 md:flex md:items-start md:justify-between md:gap-16 md:pt-6">
        <div className="animate-fade-up animate-fade-up-delay-1 max-w-xl space-y-7 md:space-y-8">
          <div>
            <h1 className="inline-block rounded bg-brand-500 px-6 py-2 text-5xl font-black tracking-tight text-white shadow-md md:text-6xl">
              YOMIBO
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-700 md:text-lg">
              「あとで読む」を資産に変える。
            </p>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              AIナレッジアシスタントのYOMIBO(ヨミーボ)です。
            </p>
          </div>
          <div className="space-y-4 text-sm text-slate-900">
            <h3 className="font-medium">
              もう、管理手法で挫折する必要はありません。
            </h3>
            <p className="text-slate-700 leading-relaxed">
              「あの記事どこで見たっけ？」「ブックマークし損ねた」——そんな後悔を繰り返すのは、
              手動の管理に限界があるからです。
              <br />
              YOMIBO は、あえて緻密な管理を捨てました。
              あなたがやることは、URLを雑にこの箱に、読み終えた時にボタンを押すだけ。
              あとの整理はすべてこのYOMIBOが引き受けます。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-full bg-brand-500 px-8 py-3 text-base font-medium text-white shadow-md shadow-brand-500/40 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-brand-600 md:px-10 md:py-3.5 md:text-lg"
            >
              今すぐはじめる
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 -mt-1 text-xs text-slate-600">
            <span className="pill border-emerald-200 bg-emerald-50 text-emerald-700">自動タグ付け</span>
            <span className="pill">AI 要約</span>
            <span className="pill border-emerald-200 bg-emerald-50 text-emerald-700">セマンティック検索</span>
            <span className="pill">読了統計</span>
          </div>
        </div>
        <div className="animate-fade-up animate-fade-up-delay-2 mt-16 w-full max-w-md md:mt-6">
          <Suspense
            fallback={
              <div className="card-surface p-6 text-xs text-slate-500">
                読み込み中...
              </div>
            }
          >
            <HomeRecentCards />
          </Suspense>
        </div>
      </section>

      <section className="animate-fade-up animate-fade-up-delay-2 space-y-8">
        <div className="space-y-1">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            使い方はかんたん
          </h2>
          <p className="text-center text-sm text-slate-600">
            URLを登録して、読み終えたら押すだけ。
            <br className="hidden md:block" />
            あとはYOMIBOが自動で整理して、興味が見える化されていきます
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          {[
            {
              step: "1",
              title: "新規登録 / ログイン",
              body: "Googleまたはメールでアカウントを作成して始めます。"
            },
            {
              step: "2",
              title: "URLを雑に投げる",
              body: "気になった記事のURLをそのまま追加するだけ。タイトルやタグは自動で整います。"
            },
            {
              step: "3",
              title: "記事一覧で管理",
              body: "未読を上に整理。タグでサッと絞り込めます。"
            },
            {
              step: "4",
              title: "読了でインサイト",
              body: "読んだら「読了」。興味タグや週次インサイトが育ちます。"
            }
          ].map((item, idx) => (
            <article
              key={item.step}
              className="card-surface flex flex-col gap-3 p-5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                {item.step}
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-700">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="animate-fade-up animate-fade-up-delay-3 space-y-10 md:space-y-12">
        {/* Tokusoku風: 大きめのCTAブロック */}
        <div className="rounded-[36px] bg-brand-500 px-6 py-12 text-center text-white md:px-12 md:py-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            「あとで読む」を資産に変えたいあなたへ
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/90 md:text-base">
            URLを雑に投げて、読み終えたら押すだけ。
            <br className="hidden md:block" />
            タグとインサイトが自動で育って、次の学びが見えてきます。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/invite?next=/signup"
              className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-brand-700 hover:bg-white/90 md:py-3.5 md:text-base"
            >
              無料ではじめる
            </Link>
            <Link
              href="/login"
              className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-white/70 bg-transparent px-8 py-3 text-sm font-semibold text-white hover:bg-white/10 md:py-3.5 md:text-base"
            >
              ログイン
            </Link>
          </div>
        </div>

        {/* 下段はロゴのみ（Tokusokuの雰囲気に寄せる） */}
        <div className="pt-2 text-center">
          <div className="inline-block rounded bg-brand-500 px-6 py-2 text-3xl font-black tracking-tight text-white shadow-md md:text-4xl">
            YOMIBO
          </div>
          <p className="mt-2 text-xs text-slate-500">
            「あとで読む」を資産に変える
          </p>
        </div>
      </section>
    </div>
  );
}
