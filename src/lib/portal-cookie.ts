import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "portal_id";
const MAX_AGE_DAYS = 30;

function secret() {
  const s = process.env.PORTAL_COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "PORTAL_COOKIE_SECRET is not set (or too short). Add it to .env.local and Vercel.",
    );
  }
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export type PortalIdentity = {
  email: string;
  clientId: string;
  name: string;
  coworkingId: string;
  coworkingName: string;
  // Issued-at timestamp (ms), so we can decide to refresh stale data later
  iat: number;
};

export async function setPortalCookie(identity: Omit<PortalIdentity, "iat">) {
  const payload: PortalIdentity = { ...identity, iat: Date.now() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(encoded);
  const value = `${encoded}.${sig}`;

  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * MAX_AGE_DAYS,
  });
}

export async function getPortalCookie(): Promise<PortalIdentity | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie) return null;

  const idx = cookie.value.lastIndexOf(".");
  if (idx <= 0) return null;
  const encoded = cookie.value.slice(0, idx);
  const sig = cookie.value.slice(idx + 1);

  const expected = sign(encoded);
  let ok = false;
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    ok = a.length === b.length && timingSafeEqual(a, b);
  } catch {
    ok = false;
  }
  if (!ok) return null;

  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const data = JSON.parse(json) as PortalIdentity;
    if (!data.email || !data.clientId) return null;
    return data;
  } catch {
    return null;
  }
}

export async function clearPortalCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
