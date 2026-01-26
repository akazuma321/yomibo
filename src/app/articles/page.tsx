import { Suspense } from "react";
import ArticlesClient from "./ArticlesClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl py-10 text-sm text-slate-500">読み込み中...</div>}>
      <ArticlesClient />
    </Suspense>
  );
}
