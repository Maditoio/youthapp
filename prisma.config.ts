import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      // Neon pooler rejects Prisma startup params; prefer the direct URL.
      // uselibpqcompat keeps sslmode=require semantics for the current pg driver.
      connection: (() => {
        const raw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!;
        try {
          const parsed = new URL(raw);
          const mode = (parsed.searchParams.get("sslmode") || "").toLowerCase();
          if ((mode === "require" || mode === "prefer" || mode === "verify-ca") && !parsed.searchParams.has("uselibpqcompat")) {
            parsed.searchParams.set("uselibpqcompat", "true");
          }
          return parsed.toString();
        } catch {
          return raw;
        }
      })(),
    },
  }),
});
