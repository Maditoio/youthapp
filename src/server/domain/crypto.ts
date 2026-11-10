import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const SCRYPT = { N: 8192, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function uid(): string {
  return randomUUID();
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  const hash = scryptSync(password, salt, 32, SCRYPT).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32, SCRYPT);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

export function hashCode(code: string): string {
  return createHash("sha256").update(`jeunese-demo-code:${code}`).digest("hex");
}

export function verifyCode(code: string, stored: string): boolean {
  const next = Buffer.from(hashCode(code), "hex");
  const prev = Buffer.from(stored, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function randomDigits(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function signPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}
