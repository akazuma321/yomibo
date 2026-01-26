import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import {
  INVITE_COOKIE_NAME,
  isInviteCookieValueValid,
  isInviteRequired
} from "@/lib/invite";

const DEV_FALLBACK_SECRET = "dev-secret-change-me";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // ローカル開発でURL/Hostまわりのエラーを避ける
  trustHost: true,
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET
          })
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email;
        const passwordRaw = credentials?.password;

        if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
          return null;
        }

        const email = emailRaw.toLowerCase().trim();
        const password = passwordRaw;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      const email = user?.email ? user.email.toLowerCase().trim() : null;
      if (!email) return false;

      // 招待コード（初回のみ）: DBで招待済みならスキップ。未招待ならCookieが必要。
      const inviteRequired = isInviteRequired();
      const inviteCookie = inviteRequired
        ? cookies().get(INVITE_COOKIE_NAME)?.value
        : undefined;
      const dbUser = await prisma.user.findUnique({ where: { email } });
      const acceptNow =
        inviteRequired &&
        !dbUser?.inviteAcceptedAt &&
        isInviteCookieValueValid(inviteCookie);

      if (inviteRequired && !dbUser?.inviteAcceptedAt && !acceptNow) {
        return false; // AccessDenied
      }

      // Googleログインは「初回=登録」として扱い、Userテーブルに必ず作成/更新する
      if (account?.provider === "google") {
        const now = new Date();
        const upserted = await prisma.user.upsert({
          where: { email },
          create: {
            email,
            name: user.name ?? null,
            inviteAcceptedAt: acceptNow ? now : null
          },
          update: {
            name: user.name ?? null,
            ...(acceptNow ? { inviteAcceptedAt: now } : {})
          }
        });
        // OAuthのuser.idはDBのUser.idと一致しないことがあるため、JWT生成に使えるよう差し替える
        (user as any).id = upserted.id;
        return true;
      }

      // Credentialsログイン: 未招待ユーザーが通った場合、ここで招待済みにする
      if (acceptNow && dbUser && !dbUser.inviteAcceptedAt) {
        await prisma.user.update({
          where: { email },
          data: { inviteAcceptedAt: new Date() }
        });
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) token.sub = user.id;
      // OAuth(Google)ログイン時は、token.sub がDBのUser.idにならないことがあるため、
      // emailでDBを引いて必ずDBのUser.idに揃える（CuraQ同様にユーザーごとに完全分離するため）
      const shouldLookup =
        Boolean(token?.email) && (!token.sub || account?.provider === "google");
      if (shouldLookup) {
        const email = String(token.email).toLowerCase().trim();
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (dbUser?.id) {
          token.sub = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    }
  },
  // 本番は必ず環境変数で設定する。ローカル開発だけフォールバックを許可。
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV !== "production" ? DEV_FALLBACK_SECRET : undefined)
});

