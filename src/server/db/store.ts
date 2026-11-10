import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
/**
 * Demo persistence. Screens use this file store.
 * PostgreSQL tables are described in src/prisma/contract.prisma and open through src/prisma/db.ts
 * once DATABASE_URL is set and `npx prisma db init` has been run.
 */
import { createDemoDatabase } from "./seed";
import type { Database } from "../domain/types";
import { STORE_VERSION } from "../domain/types";
import { AppError } from "../domain/errors";

export class Store {
  constructor(public db: Database) {}

  persist() {}

  update<T>(fn: (db: Database) => T): T {
    const snapshot = structuredClone(this.db);
    try {
      const result = fn(this.db);
      this.persist();
      return result;
    } catch (error) {
      this.db = snapshot;
      throw error;
    }
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
        fresh.persist();
        return fresh;
      }
      return new FileStore(parsed, filePath);
    } catch {
      const fresh = new FileStore(createDemoDatabase(), filePath);
      fresh.persist();
      return fresh;
    }
  }

  persist() {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.db));
  }

  reset() {
    this.db = createDemoDatabase();
    this.persist();
  }
}

const globalStore = globalThis as unknown as { jeuneseStore?: FileStore };

export function getStore(): FileStore {
  if (!globalStore.jeuneseStore) {
    globalStore.jeuneseStore = FileStore.load();
  }
  return globalStore.jeuneseStore;
}

export function defaultPath(): string {
  return path.join(process.cwd(), "data", "demo-db.json");
}

export function asAppError(error: unknown): AppError | null {
  return error instanceof AppError ? error : null;
}
