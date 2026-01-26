import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">設定</h1>
        <p className="text-sm text-slate-600">
          今後、プロフィール・連携・データ管理などをここに追加します。
        </p>
      </section>

      <section className="card-surface space-y-3 p-6">
        <h2 className="text-sm font-semibold text-slate-900">タグ</h2>
        <p className="text-sm text-slate-600">
          タグの整形/自動付与はインサイト画面から実行できます。
        </p>
        <Link
          href="/insights"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm text-slate-800 hover:border-brand-500"
        >
          インサイトへ
        </Link>
      </section>
    </div>
  );
}

