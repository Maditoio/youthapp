import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "../db/store";
import type { Database, Role, User } from "../domain/types";
import { rolesFor } from "../domain/finance";

const COOKIE = "jeunese_session";
const MFA_COOKIE = "jeunese_mfa";

function secret(): string {
  return process.env.SESSION_SECRET || "jeunese-demo-session-secret-change-me";
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: cookieSecure(),
  };
}

function sign(payload: string): string {
  const mac = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function read(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid: string;
      exp: number;
    };
    if (parsed.exp < Date.now()) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

function encode(userId: string, hours: number): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + hours * 60 * 60 * 1000 }),
  ).toString("base64url");
  return sign(payload);
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, encode(userId, 24 * 12), {
    ...cookieBase(),
    maxAge: 60 * 60 * 24 * 12,
  });
  jar.delete(MFA_COOKIE, cookieBase());
}

export async function setMfaPending(userId: string) {
  const jar = await cookies();
  jar.set(MFA_COOKIE, encode(userId, 0.5), {
    ...cookieBase(),
    maxAge: 60 * 30,
  });
}

export async function readMfaPending(): Promise<string | null> {
  const jar = await cookies();
  return read(jar.get(MFA_COOKIE)?.value);
}

export async function clearSession() {
  const jar = await cookies();
  const base = cookieBase();
  // Match path/secure used at set-time so browsers actually drop the cookie.
  jar.set(COOKIE, "", { ...base, maxAge: 0 });
  jar.set(MFA_COOKIE, "", { ...base, maxAge: 0 });
  jar.delete(COOKIE, base);
  jar.delete(MFA_COOKIE, base);
}

export interface Session {
  user: User;
  roles: Role[];
  db: Database;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const userId = read(jar.get(COOKIE)?.value);
  if (!userId) return null;
  const db = (await getStore()).db;
  const user = db.users.find((item) => item.id === userId && item.accountStatus === "ACTIVE");
  if (!user) return null;
  return { user, roles: rolesFor(db, user.id), db };
}
