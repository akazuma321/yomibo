import { Suspense } from "react";
import SignupClient from "./SignupClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md py-10 text-sm text-slate-500">読み込み中...</div>}>
      <SignupClient />
    </Suspense>
  );
}
