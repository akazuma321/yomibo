import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/pricing", "/invite"]);
const INVITE_COOKIE_NAME = "yomibo.invite";

function truthyEnv(v: string | undefined) {
  const s = (v ?? "").toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function isInviteRequired() {
  return truthyEnv(process.env.INVITE_REQUIRED);
}

function hasSessionCookie(req: NextRequest) {
  // next-auth(v4) / auth.js(v5) の代表的なCookie名を幅広く見る
  const names = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token"
  ];
  return names.some((name) => Boolean(req.cookies.get(name)?.value));
}

export default function middleware(req: NextRequest) {
  const { nextUrl } = req;
  // OAuth(PKCE)のcookieチェックはホスト単位で効くため、
  // 開発中に `127.0.0.1` と `localhost` を混在させると
  // 「PKCE code_verifier cookie was missing」が発生しやすい。
  // 事故防止のため、開発時は `localhost` に正規化する。
  const host = req.headers.get("host") ?? "";
  if (process.env.NODE_ENV !== "production" && host.startsWith("127.0.0.1")) {
    const url = nextUrl.clone();
    url.hostname = "localhost";
    return NextResponse.redirect(url);
  }

  const pathname = nextUrl.pathname;

  // 新規登録の前に招待コード入力を挟む（CuraQと同じ体験）
  // ※ 実際の登録可否は /api/auth/signup 側でも検証しているため、ここはUX目的の誘導。
  if (pathname === "/signup" && isInviteRequired()) {
    const inviteCookie = req.cookies.get(INVITE_COOKIE_NAME)?.value;
    if (!inviteCookie) {
      const url = new URL("/invite", nextUrl);
      url.searchParams.set("next", "/signup");
      return NextResponse.redirect(url);
    }
  }

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (pathname.startsWith("/api/invite")) return NextResponse.next();
  if (pathname.startsWith("/_next")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();

  if (!hasSessionCookie(req)) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // 127.0.0.1→localhost の正規化を含め、広めに適用する。
  // その上でPUBLIC_PATHS等で挙動を分岐する。
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

