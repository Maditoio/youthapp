import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const contract = contractFromJson<Contract>(contractJson);

/**
 * Neon’s pooled URL rejects Prisma startup params such as lc_monetary.
 * Prefer the direct (unpooled) connection when both are set.
 */
export function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();
  return raw ? withLibpqSslCompat(raw) : undefined;
}

/** Keeps today’s sslmode=require behavior and silences the pg v9 deprecation warning. */
function withLibpqSslCompat(url: string): string {
  try {
    const parsed = new URL(url);
    const mode = (parsed.searchParams.get("sslmode") || "").toLowerCase();
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      if (!parsed.searchParams.has("uselibpqcompat")) {
        parsed.searchParams.set("uselibpqcompat", "true");
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Opens PostgreSQL only when a connection string is set. The demo file store stays in use until then. */
export function openDatabase() {
  const url = databaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env, then run npx prisma db init.");
  }
  return postgres({ contract, url });
}
