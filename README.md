# YOMIBO (CuraQ風・個人用ナレッジログ)

「[CuraQ](https://curaq.app/)」風の UI / 体験を持つ、自分用のローカルナレッジログです。

 - トップページ: コンセプトと機能紹介
 - `/search`: URL の登録・一覧・検索・読了フラグ
 - `/insights`: 読了記事をもとにした簡易的な週次インサイト
 - `/pricing`: 開発者を応援（単発の支援ボタン）

## ローカルセットアップ

```bash
cd curaq-clone
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

ブラウザで `http://localhost:3000`（または表示されたポート）にアクセスします。

### 環境変数

このリポジトリでは `.env*` が編集ブロックされることがあるため、まず `ENV.example` を参考にして、
手元で **`.env.local`** を作成してください（中身は自分のPC内だけに置く想定です）。

`ENV.example` → `.env.local` にコピーして編集:

```bash
cp ENV.example .env.local
```

## アカウント(ログイン/新規登録)

本プロジェクトは **メール/パスワードでの新規登録・ログイン** に対応しています。

### 1) `AUTH_SECRET`

`.env.local` に `AUTH_SECRET` を設定してください（本番では必須）。

```bash
# 例: ランダムな値を作って貼り付ける
openssl rand -base64 32
```

`.env.local` 例:

```bash
AUTH_SECRET="ここにランダム文字列"
```

### Googleログイン（任意）

Googleでログインしたい場合は、Google Cloud Console で OAuth クライアントを作成し、
`.env.local` に以下を設定してください。

```bash
AUTH_GOOGLE_ID="xxxxxxxxxxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="xxxxxxxxxxxxxxxxxxxx"
```

ローカルの承認済みリダイレクトURI例:

- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3001/api/auth/callback/google`
- `http://localhost:3002/api/auth/callback/google`

※ `npm run dev` 実行時に表示されるポート（3000/3001/3002...）と一致させてください。

### 2) マイグレーション

ユーザーに `passwordHash` を追加しているため、未適用の場合はマイグレーションを実行してください。

```bash
npx prisma migrate dev --name add_password_hash
```

### 3) 使い方

- 新規登録: `/signup`
- ログイン: `/login`

## セマンティック検索 (任意)

環境変数 `OPENAI_API_KEY` を設定すると、`/api/search` が OpenAI 埋め込みを使った
セマンティック検索（曖昧検索）モードになります。未設定の場合は、通常の LIKE 検索で動作します。

## オンライン公開（20人に展開する想定）

結論：**Vercel + Postgres（Neon/Supabase）** が最短です。SQLiteは本番の永続化に不向きなので、
本番は `DATABASE_URL` を Postgres にして運用します。

### 本番運用に切り替える（重要）

このプロジェクトは、開発時に限り `DATABASE_URL` 未設定でも動くように
ローカル保存（`.local-data/articles.json`）へフォールバックします。
**本番（Vercelなど）では必ず Postgres を設定してください。**

手順は次の通りです。

### 0) Postgres を用意（Neon推奨）

- Neon（無料枠あり）でDBを作成し、接続文字列を取得
- 取得した接続文字列を Vercel の Environment Variables に `DATABASE_URL` として登録

### 1) Vercel にデプロイ

- GitHubにPush → VercelでImportしてDeploy
- Vercelの Environment Variables に最低限これを設定:
  - `DATABASE_URL`
  - `DIRECT_URL`（NeonのDirect / Non-pooled。Prismaマイグレーション用。Vercelでも入れておくと安全）
  - `AUTH_SECRET`
  - `AUTH_URL`（例: `https://your-app.vercel.app`）
  - `NEXTAUTH_URL`（例: `https://your-app.vercel.app`）
  - （任意）`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
  - （任意）`OPENAI_API_KEY`
  - （任意）招待制: `INVITE_REQUIRED` / `INVITE_CODE(S)` など
  - （任意）応援ボタン: `SUPPORT_LINK_COFFEE_SMALL_300` 等

### 2) Prisma マイグレーション（本番）

VercelのBuild/Deployとは別に、DBにテーブルを作る必要があります。
一番簡単なのは、手元から **本番DBに向けて** 1回だけ実行する方法です:

```bash
# 例: .env.local の DATABASE_URL（=Pooled）と DIRECT_URL（=Direct）を本番Postgresにしてから
npx prisma migrate deploy
```

### 2.5) 本番の疎通確認（おすすめ）

デプロイ後に、`/api/health` を開いて **DB接続がOKか** を確認できます。

- `ok: true` ならOK
- `ok: false` なら `DATABASE_URL` / 接続権限 / IP制限 などを見直してください

### 3) ローカル保存のデータを本番DBへ移す（任意）

開発中に `.local-data/articles.json` に溜めた記事を本番DBへ移したい場合は、
スクリプトで移行できます（新しく追加されたローカル記事は `userEmail` を持つので移行可能です）。

```bash
# .env.local の DATABASE_URL を本番Postgresにしてから
npm run import:fallback
```

### 3) Google OAuth（本番URLを追加）

Google Cloud Console の OAuth クライアント設定で、承認済みリダイレクトURIに以下を追加:

- `https://<あなたの本番ドメイン>/api/auth/callback/google`

### 4) 20人に配る方法

- いまの仕様は「誰でもGoogle/メールで登録してログイン」できます。
- **招待制にしたい**場合は、許可メールのホワイトリスト（例: 20人のメール）を入れる対応も可能です。
