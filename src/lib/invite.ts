import crypto from "crypto";

export const INVITE_COOKIE_NAME = "yomibo.invite";

function truthyEnv(v: string | undefined) {
  const s = (v ?? "").toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export function isInviteRequired() {
  return truthyEnv(process.env.INVITE_REQUIRED);
}

function parseInviteCodes(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(/[,\\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isInviteCodeValid(codeRaw: string) {
  if (!isInviteRequired()) return true;
  const code = String(codeRaw ?? "").trim();
  if (!code) return false;

  // 互換: INVITE_CODE(単一) / INVITE_CODES(複数)
  const single = (process.env.INVITE_CODE ?? "").trim();
  if (single && code === single) return true;

  const codes = parseInviteCodes(process.env.INVITE_CODES);
  if (codes.length === 0) return false; // 必須なのに未設定なら安全側で閉じる
  return codes.includes(code);
}

function getCookieSecret() {
  return (
    process.env.INVITE_COOKIE_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-secret-change-me"
  );
}

export function createInviteCookieValue(nowMs = Date.now()) {
  const ts = Math.floor(nowMs / 1000);
  const payload = `v1.${ts}`;
  const sig = crypto
    .createHmac("sha256", getCookieSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function isInviteCookieValueValid(value: string | undefined) {
  if (!isInviteRequired()) return true;
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [v, tsRaw, sig] = parts;
  if (v !== "v1") return false;
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts) || ts <= 0) return false;

  const payload = `v1.${ts}`;
  const expected = crypto
    .createHmac("sha256", getCookieSecret())
    .update(payload)
    .digest("hex");

  // timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  // 有効期限（デフォルト: 24h）
  const maxAgeSec = Number(process.env.INVITE_COOKIE_MAX_AGE_SEC ?? "86400");
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - ts > maxAgeSec) return false;
  return true;
}

