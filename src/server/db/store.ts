import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
/**
 * Persistence switch:
 * - DATABASE_URL or DATABASE_URL_UNPOOLED set → PostgreSQL via Prisma 8 (src/prisma/db.ts)
 * - otherwise → local JSON FileStore (demo)
 * Neon pooled URLs reject Prisma startup params; prefer DATABASE_URL_UNPOOLED.
 */
import { createDemoDatabase } from "./seed";
import type { Database } from "../domain/types";
import { STORE_VERSION } from "../domain/types";
import { AppError } from "../domain/errors";

export class Store {
  constructor(public db: Database) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async refresh(_maxAgeMs?: number): Promise<void> {}

  async persist(): Promise<void> {}

  async update<T>(fn: (db: Database) => T): Promise<T> {
    const snapshot = structuredClone(this.db);
    try {
      const result = fn(this.db);
      await this.persist();
      return result;
    } catch (error) {
      this.db = snapshot;
      throw error;
    }
  }

  async reset(): Promise<void> {
    this.db = createDemoDatabase();
    await this.persist();
  }
}

export class FileStore extends Store {
  constructor(
    db: Database,
    private filePath: string,
  ) {
    super(db);
  }

  static load(filePath = defaultPath()): FileStore {
    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Database;
      if (parsed.version !== STORE_VERSION) {
        const fresh = new FileStore(createDemoDatabase(), filePath);
        void fresh.persist();
        return fresh;
      }
      return new FileStore(parsed, filePath);
    } catch {
      const fresh = new FileStore(createDemoDatabase(), filePath);
      void fresh.persist();
      return fresh;
    }
  }

  async persist() {
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(this.db));
    } catch {
      // The demo still serves from memory when the host filesystem is read-only.
    }
  }
}

type GlobalStore = {
  jeuneseStore?: Store;
  jeuneseStorePromise?: Promise<Store>;
};

const globalStore = globalThis as unknown as GlobalStore;

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim());
}

export async function getStore(): Promise<Store> {
  if (!globalStore.jeuneseStorePromise) {
    globalStore.jeuneseStorePromise = openStore().then(
      (store) => {
        globalStore.jeuneseStore = store;
        return store;
      },
      (error: unknown) => {
        // Let the next request retry instead of caching the failure for the instance's lifetime.
        globalStore.jeuneseStorePromise = undefined;
        throw error;
      },
    );
  }
  const store = globalStore.jeuneseStore ?? (await globalStore.jeuneseStorePromise);
  // Reads may lag other instances by this much; writes always re-read under a lock.
  if (hasDatabaseUrl()) await store.refresh(READ_MAX_AGE_MS);
  return store;
}

const READ_MAX_AGE_MS = 2000;

async function openStore(): Promise<Store> {
  if (hasDatabaseUrl()) {
    const { PostgresStore } = await import("./postgres-store");
    return PostgresStore.open();
  }
  return FileStore.load();
}

export function isReadonlyServerlessFs(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

export function defaultPath(): string {
  const root = isReadonlyServerlessFs()
    ? path.join(os.tmpdir(), "jeunese")
    : path.join(process.cwd(), "data");
  return path.join(root, "demo-db.json");
}

export function asAppError(error: unknown): AppError | null {
  return error instanceof AppError ? error : null;
}
