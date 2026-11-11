import { randomUUID } from "node:crypto";
import { openDatabase } from "@/prisma/db";
import type { Database } from "../domain/types";
import { STORE_VERSION } from "../domain/types";
import { describeDbError } from "./errors";
import { createEmptyDatabase } from "./seed";
import { Store } from "./store";

type PgClient = ReturnType<typeof openDatabase>;

type FieldOps = {
  in: (values: string[]) => unknown;
};

type OrmFilter = Record<string, unknown> | ((row: Record<string, FieldOps>) => unknown);

type OrmModel = {
  all: () => PromiseLike<Record<string, unknown>[]>;
  createAll: (rows: Record<string, unknown>[]) => PromiseLike<unknown>;
  where: (filter: OrmFilter) => {
    deleteAll: () => PromiseLike<unknown>;
    updateAll: (data: Record<string, unknown>) => PromiseLike<unknown>;
  };
};

type OrmTx = {
  orm: { public: Record<string, OrmModel> };
  query: (plan: unknown) => PromiseLike<unknown[]>;
};

const PLATFORM_STATE_ID = "jeunese";

const BATCH_SIZE = 200;

/** Child → parent order for deletes. Inserts run in reverse. */
const MODEL_ORDER = [
  "LoginAttempt",
  "AuditLog",
  "SupportMessage",
  "SupportTicket",
  "Notification",
  "Allocation",
  "NominationSet",
  "NextOfKin",
  "InheritanceCase",
  "ShareholderVote",
  "ResolutionEligibility",
  "Resolution",
  "DividendPayment",
  "DividendEntitlement",
  "DividendDeclaration",
  "ShareCertificate",
  "ShareholdingEvent",
  "ShareIssuance",
  "AllotmentBatch",
  "LedgerEntry",
  "LedgerTransaction",
  "LedgerAccount",
  "CompanyFinancing",
  "Refund",
  "PaymentTransaction",
  "SubscriptionAcceptance",
  "Subscription",
  "OfferingDocument",
  "OfferingShareTerms",
  "Offering",
  "ProjectUpdate",
  "Project",
  "ShareClass",
  "IssuerRepresentative",
  "Issuer",
  "KycDocument",
  "KycCase",
  "InvestorProfile",
  "StaffProfile",
  "UserRole",
  "EmailVerification",
  "AuthIdentity",
  "User",
  "Faq",
  "Article",
  "IdentityPolicy",
  "PlatformState",
] as const;

type ModelName = (typeof MODEL_ORDER)[number];

const COLLECTION_BY_MODEL: Partial<Record<ModelName, keyof Database>> = {
  User: "users",
  AuthIdentity: "authIdentities",
  EmailVerification: "emailVerifications",
  InvestorProfile: "investorProfiles",
  KycCase: "kycCases",
  KycDocument: "kycDocuments",
  StaffProfile: "staffProfiles",
  UserRole: "userRoles",
  Issuer: "issuers",
  IssuerRepresentative: "issuerRepresentatives",
  Project: "projects",
  ProjectUpdate: "projectUpdates",
  Offering: "offerings",
  ShareClass: "shareClasses",
  OfferingShareTerms: "offeringShareTerms",
  OfferingDocument: "offeringDocuments",
  Subscription: "subscriptions",
  SubscriptionAcceptance: "subscriptionAcceptances",
  PaymentTransaction: "payments",
  Refund: "refunds",
  CompanyFinancing: "companyFinancings",
  LedgerAccount: "ledgerAccounts",
  LedgerTransaction: "ledgerTransactions",
  LedgerEntry: "ledgerEntries",
  AllotmentBatch: "allotmentBatches",
  ShareIssuance: "shareIssuances",
  ShareholdingEvent: "shareholdingEvents",
  ShareCertificate: "shareCertificates",
  DividendDeclaration: "dividendDeclarations",
  DividendEntitlement: "dividendEntitlements",
  DividendPayment: "dividendPayments",
  Resolution: "resolutions",
  ResolutionEligibility: "resolutionEligibility",
  ShareholderVote: "votes",
  NextOfKin: "nextOfKin",
  NominationSet: "nominationSets",
  Allocation: "allocations",
  InheritanceCase: "inheritanceCases",
  Notification: "notifications",
  SupportTicket: "supportTickets",
  SupportMessage: "supportMessages",
  AuditLog: "auditLogs",
  Article: "articles",
  Faq: "faqs",
  IdentityPolicy: "identityPolicies",
  LoginAttempt: "loginAttempts",
};

function ormOf(client: PgClient): Record<string, OrmModel> {
  return client.orm.public as unknown as Record<string, OrmModel>;
}

function toProjectRow(project: Database["projects"][number]): Record<string, unknown> {
  const { useOfProceeds, team, ...rest } = project;
  return {
    ...rest,
    useOfProceedsJson: JSON.stringify(useOfProceeds ?? []),
    teamJson: JSON.stringify(team ?? []),
  };
}

function fromProjectRow(row: Record<string, unknown>): Database["projects"][number] {
  const { useOfProceedsJson, teamJson, ...rest } = row;
  return {
    ...(rest as unknown as Database["projects"][number]),
    useOfProceeds: JSON.parse(String(useOfProceedsJson ?? "[]")),
    team: JSON.parse(String(teamJson ?? "[]")),
  };
}

function toOfferingRow(offering: Database["offerings"][number]): Record<string, unknown> {
  const { existingCap, ...rest } = offering;
  return {
    ...rest,
    existingCapJson: JSON.stringify(existingCap ?? []),
  };
}

function fromOfferingRow(row: Record<string, unknown>): Database["offerings"][number] {
  const { existingCapJson, ...rest } = row;
  return {
    ...(rest as unknown as Database["offerings"][number]),
    existingCap: JSON.parse(String(existingCapJson ?? "[]")),
  };
}

/** Login attempts carry no id in the domain model; remember the row id of each loaded object. */
const loginAttemptIds = new WeakMap<object, string>();

function toLoginRow(attempt: Database["loginAttempts"][number]): Record<string, unknown> {
  let id = loginAttemptIds.get(attempt);
  if (!id) {
    id = `login-${randomUUID()}`;
    loginAttemptIds.set(attempt, id);
  }
  return {
    id,
    email: attempt.email,
    userId: null,
    at: attempt.at,
    success: attempt.success,
  };
}

function fromLoginRow(row: Record<string, unknown>): Database["loginAttempts"][number] {
  const attempt = {
    email: String(row.email ?? ""),
    at: String(row.at ?? ""),
    success: Boolean(row.success),
  };
  loginAttemptIds.set(attempt, String(row.id));
  return attempt;
}

function rowsForModel(db: Database, model: ModelName): Record<string, unknown>[] {
  if (model === "PlatformState") {
    return [{ id: PLATFORM_STATE_ID, version: db.version, clock: db.clock }];
  }
  const key = COLLECTION_BY_MODEL[model];
  if (!key) return [];
  const items = db[key] as unknown[];
  if (model === "Project") return (items as Database["projects"]).map(toProjectRow);
  if (model === "Offering") return (items as Database["offerings"]).map(toOfferingRow);
  if (model === "LoginAttempt") return (items as Database["loginAttempts"]).map((item) => toLoginRow(item));
  return items.map((item) => ({ ...(item as Record<string, unknown>) }));
}

function applyRows(db: Database, model: ModelName, rows: Record<string, unknown>[]) {
  if (model === "PlatformState") {
    const state = rows[0];
    if (state) {
      db.version = Number(state.version ?? STORE_VERSION);
      db.clock = String(state.clock ?? db.clock);
    }
    return;
  }
  const key = COLLECTION_BY_MODEL[model];
  if (!key) return;
  if (model === "Project") {
    db.projects = rows.map(fromProjectRow);
    return;
  }
  if (model === "Offering") {
    db.offerings = rows.map(fromOfferingRow);
    return;
  }
  if (model === "LoginAttempt") {
    db.loginAttempts = rows.map(fromLoginRow);
    return;
  }
  (db as unknown as Record<string, unknown[]>)[key] = rows;
}

type RawTables = Map<ModelName, Record<string, unknown>[]>;
type IndexedRows = Map<string, { row: Record<string, unknown>; signature: string }>;
type Baseline = Map<ModelName, IndexedRows>;

function primaryKeyOf(model: ModelName): string {
  return model === "IdentityPolicy" ? "countryCode" : "id";
}

/** Key-order independent; `undefined` and `null` compare equal. */
function signatureOf(row: Record<string, unknown>): string {
  return JSON.stringify(row, (_key, value: unknown) => {
    if (value === undefined) return null;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      );
    }
    return value;
  });
}

function indexRows(model: ModelName, rows: Record<string, unknown>[]): IndexedRows {
  const pk = primaryKeyOf(model);
  const indexed: IndexedRows = new Map();
  for (const row of rows) indexed.set(String(row[pk]), { row, signature: signatureOf(row) });
  return indexed;
}

async function readTables(orm: Record<string, OrmModel>, parallel: boolean): Promise<RawTables> {
  const tables: RawTables = new Map();
  if (parallel) {
    const results = await Promise.all(MODEL_ORDER.map((model) => orm[model].all()));
    MODEL_ORDER.forEach((model, index) => tables.set(model, results[index]));
  } else {
    for (const model of MODEL_ORDER) tables.set(model, await orm[model].all());
  }
  return tables;
}

/** A database with no rows at all starts from the empty seed; it is written on the first update. */
function buildDatabase(tables: RawTables): Database {
  const db = createEmptyDatabase();
  if (![...tables.values()].some((rows) => rows.length)) return db;
  for (const model of MODEL_ORDER) applyRows(db, model, tables.get(model) ?? []);
  return db;
}

function baselineOf(tables: RawTables): Baseline {
  const baseline: Baseline = new Map();
  for (const model of MODEL_ORDER) baseline.set(model, indexRows(model, tables.get(model) ?? []));
  return baseline;
}

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) out.push(items.slice(i, i + BATCH_SIZE));
  return out;
}

function withoutKey(row: Record<string, unknown>, pk: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key !== pk && value !== undefined) data[key] = value;
  }
  return data;
}

/** Writes only rows that changed since `baseline`: inserts/updates parent → child, deletes child → parent. */
async function applyDiff(orm: Record<string, OrmModel>, baseline: Baseline, db: Database): Promise<void> {
  const next = new Map<ModelName, IndexedRows>();
  for (const model of MODEL_ORDER) next.set(model, indexRows(model, rowsForModel(db, model)));

  for (const model of [...MODEL_ORDER].reverse()) {
    const pk = primaryKeyOf(model);
    const before = baseline.get(model) ?? new Map();
    const inserts: Record<string, unknown>[] = [];
    const updates: Array<[string, Record<string, unknown>]> = [];
    for (const [key, item] of next.get(model) ?? new Map()) {
      const previous = before.get(key);
      if (!previous) inserts.push(item.row);
      else if (previous.signature !== item.signature) updates.push([key, item.row]);
    }
    for (const batch of chunks(inserts)) await orm[model].createAll(batch);
    for (const [key, row] of updates) {
      const data = withoutKey(row, pk);
      if (Object.keys(data).length) await orm[model].where({ [pk]: key }).updateAll(data);
    }
  }

  for (const model of MODEL_ORDER) {
    const pk = primaryKeyOf(model);
    const after = next.get(model) ?? new Map();
    const removed = [...(baseline.get(model)?.keys() ?? [])].filter((key) => !after.has(key));
    for (const batch of chunks(removed)) {
      await orm[model].where((row) => row[pk].in(batch)).deleteAll();
    }
  }
}

/** Postgres error classes that are safe to retry with a fresh read. */
const RETRYABLE_SQL_STATES = new Set(["40001", "40P01", "25P02", "55P03", "23505"]);

function isRetryable(error: unknown): boolean {
  const { sqlState } = describeDbError(error);
  return Boolean(sqlState && RETRYABLE_SQL_STATES.has(sqlState));
}

export class PostgresStore extends Store {
  private client: PgClient;
  private loadedAt = 0;
  private generation = 0;
  private inflight: Promise<void> | null = null;

  private constructor(db: Database, client: PgClient) {
    super(db);
    this.client = client;
  }

  static async open(): Promise<PostgresStore> {
    const store = new PostgresStore(createEmptyDatabase(), openDatabase());
    await store.refresh();
    return store;
  }

  /** Reloads every table unless the in-memory copy is younger than `maxAgeMs`. Concurrent callers share one read. */
  async refresh(maxAgeMs = 0): Promise<void> {
    if (maxAgeMs > 0 && Date.now() - this.loadedAt < maxAgeMs) return;
    if (!this.inflight) {
      const generation = this.generation;
      this.inflight = readTables(ormOf(this.client), true)
        .then((tables) => {
          // An update committed meanwhile already installed newer data.
          if (this.generation !== generation) return;
          this.db = buildDatabase(tables);
          this.loadedAt = Date.now();
        })
        .catch((error: unknown) => {
          console.error("store_refresh_failed", describeDbError(error));
          throw error;
        })
        .finally(() => {
          this.inflight = null;
        });
    }
    await this.inflight;
  }

  /**
   * Runs `fn` against a fresh read taken under a global advisory lock, then writes only the rows
   * it changed, all in one transaction. Nothing inside the transaction swallows errors: a failed
   * statement aborts the transaction, so it must surface and roll back.
   */
  async update<T>(fn: (db: Database) => T): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        const { db, result } = await this.client.transaction(async (rawTx) => {
          const tx = rawTx as unknown as OrmTx;
          await this.lockForWrite(tx);
          const tables = await readTables(tx.orm.public, false);
          const baseline = baselineOf(tables);
          const db = buildDatabase(tables);
          const result = fn(db);
          await applyDiff(tx.orm.public, baseline, db);
          return { db, result };
        });
        this.db = db;
        this.generation++;
        this.loadedAt = Date.now();
        return result;
      } catch (error) {
        if (attempt < 3 && isRetryable(error)) {
          console.warn("store_update_retry", { attempt, ...describeDbError(error) });
          continue;
        }
        if (describeDbError(error).sqlState) console.error("store_update_failed", describeDbError(error));
        throw error;
      }
    }
  }

  async reset(): Promise<void> {
    await this.update((db) => {
      Object.assign(db, createEmptyDatabase());
    });
  }

  private async lockForWrite(tx: OrmTx): Promise<void> {
    const raw = (this.client as unknown as { raw: { sql: RawSqlTag } }).raw;
    await tx.query(
      raw.sql`SELECT set_config('lock_timeout', '20s', true) AS value`.returnsRow({ value: "pg/text@1" }).build(),
    );
    // Key 727274 is arbitrary but must be the same for every writer.
    await tx.query(
      raw.sql`SELECT true AS locked FROM pg_advisory_xact_lock(727274)`.returnsRow({ locked: "pg/bool@1" }).build(),
    );
  }
}

type RawSqlTag = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => { returnsRow: (columns: Record<string, string>) => { build: () => unknown } };
