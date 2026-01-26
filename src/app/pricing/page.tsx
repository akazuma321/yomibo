import Link from "next/link";

type SupportOption = {
  label: string;
  amountYen: number;
  description: string;
  href?: string;
};

function safeLink(url: string | undefined) {
  const u = (url ?? "").trim();
  // Stripe Payment Linkなど https 前提で扱う（意図しないスキームを弾く）
  if (!u) return undefined;
  if (!u.startsWith("https://")) return undefined;
  return u;
}

export default function PricingPage() {
  const options: SupportOption[] = [
    {
      label: "コーヒー Small サイズ",
      amountYen: 300,
      description: "気軽に応援。開発のモチベになります。",
      href: safeLink(process.env.SUPPORT_LINK_COFFEE_SMALL_300)
    },
    {
      label: "コーヒー Venti サイズ",
      amountYen: 500,
      description: "しっかり応援。新機能の開発が進みます。",
      href: safeLink(process.env.SUPPORT_LINK_COFFEE_VENTI_500)
    },
    {
      label: "ビックマックセット",
      amountYen: 750,
      description: "全力応援。大きめの改善に時間を使えます。",
      href: safeLink(process.env.SUPPORT_LINK_BIGMAC_SET_750)
    }
  ];

  return (
    <div className="space-y-10 md:space-y-14">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">開発者を応援</h1>
        <p className="text-sm text-slate-600">
          YOMIBOを楽しく使っていただき、いつもありがとうございます。YOMIBOの開発を少しでも応援してくれたら嬉しいです。サブスクではなく単発です。
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {options.map((o) => (
          <div key={o.label} className="card-surface p-6">
            <div className="text-lg font-bold text-slate-900">{o.label}</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-black text-slate-900">
                ¥{o.amountYen.toLocaleString("ja-JP")}
              </span>
              <span className="pb-1 text-sm text-slate-500">/回</span>
            </div>
            <div className="mt-2 text-sm text-slate-600">{o.description}</div>

            {o.href ? (
              <a
                href={o.href}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600"
              >
                この内容で応援する
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed"
                title="未設定: SUPPORT_LINK_* を設定してください"
              >
                準備中
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="card-surface space-y-3 p-7 text-sm text-slate-700">
        <h2 className="text-lg font-bold text-slate-900">メモ</h2>
        <p>
          これはサブスクではなく、単発の支援です。ボタンは外部の決済ページ（Stripe
          Payment Link など）を開きます。
        </p>
        <p className="text-xs text-slate-500">
          管理者は環境変数にリンクを設定するだけで有効化できます（未設定の場合は「準備中」表示）。
        </p>
      </section>

      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm text-slate-800 hover:border-brand-500"
        >
          戻る
        </Link>
      </div>
    </div>
  );
}

