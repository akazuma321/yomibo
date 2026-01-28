import Link from "next/link";

type SupportOption = {
  label: string;
  amountYen: number;
  description: string;
  icon: React.ReactNode;
  href?: string;
};

function safeLink(url: string | undefined) {
  const u = (url ?? "").trim();
  // PayPayのディープリンクやStripe Payment Linkなど、明示的に許可したスキームだけ扱う
  if (!u) return undefined;
  if (u.startsWith("https://")) return u;
  if (u.startsWith("paypay://")) return u;
  return undefined;
}

export default function PricingPage() {
  const options: SupportOption[] = [
    {
      label: "コーヒー Small サイズ",
      amountYen: 300,
      description: "気軽に応援。開発のモチベになります。",
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 8h9v6a4 4 0 0 1-4 4H9a2 2 0 0 1-2-2V8Z"
            />
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 9h1a2 2 0 0 1 0 4h-1"
            />
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 6c0-1 1-2 2-2m0 2c0-1 1-2 2-2m0 2c0-1 1-2 2-2"
            />
          </svg>
        </div>
      ),
      href: safeLink(process.env.SUPPORT_LINK_COFFEE_SMALL_300)
    },
    {
      label: "コーヒー Venti サイズ",
      amountYen: 500,
      description: "しっかり応援。新機能の開発が進みます。",
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7h8v10a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V7Z"
            />
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 9h1a2 2 0 1 1 0 4h-1"
            />
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 4h4"
            />
          </svg>
        </div>
      ),
      href: safeLink(process.env.SUPPORT_LINK_COFFEE_VENTI_500)
    },
    {
      label: "ビックマックセット",
      amountYen: 750,
      description: "全力応援。大きめの改善に時間を使えます。",
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 10c1.2-2 3.6-3 6-3s4.8 1 6 3"
            />
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12h12"
            />
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 14h10"
            />
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.5 17h11a2 2 0 0 0 2-2v-1H4.5v1a2 2 0 0 0 2 2Z"
            />
          </svg>
        </div>
      ),
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
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-bold text-slate-900">{o.label}</div>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-4xl font-black text-slate-900">
                    ¥{o.amountYen.toLocaleString("ja-JP")}
                  </span>
                  <span className="pb-1 text-sm text-slate-500">/回</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">{o.description}</div>
              </div>
              <div className="shrink-0">{o.icon}</div>
            </div>

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
          これはサブスクではなく、単発の支援です。ボタンは外部の決済ページ（Squareの決済リンク/Stripe Payment Link/PayPayの支払いリンク など）を開きます。
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

