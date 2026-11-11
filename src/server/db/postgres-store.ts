import { openDatabase } from "@/prisma/db";
import type { Database } from "../domain/types";
import { STORE_VERSION } from "../domain/types";
import { createEmptyDatabase } from "./seed";
import { Store } from "./store";

type PgClient = ReturnType<typeof openDatabase>;

type OrmFilter = Record<string, unknown> | ((row: { id: FieldOps; countryCode: FieldOps }) => unknown);

type FieldOps = {
  eq: (value: string) => unknown;
  neq: (value: string) => unknown;
};

type OrmModel = {
  all: () => PromiseLike<Record<string, unknown>[]>;
  createAll: (rows: Record<string, unknown>[]) => PromiseLike<unknown>;
  create: (row: Record<string, unknown>) => PromiseLike<unknown>;
  where: (filter: OrmFilter) => {
    deleteAll: () => PromiseLike<unknown>;
    updateAll: (data: Record<string, unknown>) => PromiseLike<unknown>;
    upsert: (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => PromiseLike<unknown>;
  };
};

const PLATFORM_STATE_ID = "jeunese";

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

function toLoginRow(attempt: Database["loginAttempts"][number], index: number): Record<string, unknown> {
  return {
    id: `login-${index}-${attempt.at}-${attempt.email}`,
    email: attempt.email,
    userId: null,
    at: attempt.at,
    success: attempt.success,
  };
}

function fromLoginRow(row: Record<string, unknown>): Database["loginAttempts"][number] {
  return {
    email: String(row.email ?? ""),
    at: String(row.at ?? ""),
    success: Boolean(row.success),
  };
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
  if (model === "LoginAttempt") return (items as Database["loginAttempts"]).map(toLoginRow);
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

export class PostgresStore extends Store {
  private client: PgClient;

  private constructor(db: Database, client: PgClient) {
    super(db);
    this.client = client;
  }

  static async open(): Promise<PostgresStore> {
    const client = openDatabase();
    const db = await hydrate(client);
    return new PostgresStore(db, client);
  }

  async persist(): Promise<void> {
    await persistAll(this.client, this.db);
  }

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
    this.db = createEmptyDatabase();
    await this.persist();
  }
}

async function hydrate(client: PgClient): Promise<Database> {
  const orm = ormOf(client);
  const empty = createEmptyDatabase();
  try {
    const stateRows = await orm.PlatformState.all();
    if (!stateRows.length) {
      await persistAll(client, empty);
      return empty;
    }
    for (const model of MODEL_ORDER) {
      const rows = await orm[model].all();
      applyRows(empty, model, rows);
    }
    return empty;
  } catch {
    // Tables may not exist until `npx prisma db init` has been run.
    return empty;
  }
}

/**
 * Prisma 8 object `where` is equality-only. `{ id: { not: "" } }` never matches,
 * so deleteAll was a no-op and createAll hit PlatformState_pkey (and other PKs).
 * Use equality filters or field-proxy `.neq("")` instead.
 */
async function clearModel(txOrm: Record<string, OrmModel>, model: ModelName): Promise<void> {
  if (model === "PlatformState") {
    await txOrm[model].where({ id: PLATFORM_STATE_ID }).deleteAll();
    return;
  }
  if (model === "IdentityPolicy") {
    await txOrm[model].where((row) => row.countryCode.neq("")).deleteAll();
    return;
  }
  await txOrm[model].where((row) => row.id.neq("")).deleteAll();
}

async function persistPlatformState(txOrm: Record<string, OrmModel>, db: Database): Promise<void> {
  const row = { id: PLATFORM_STATE_ID, version: db.version, clock: db.clock };
  // deleteAll + create (not single-row update/upsert): single-row writers can hang inside tx.
  await txOrm.PlatformState.where({ id: PLATFORM_STATE_ID }).deleteAll();
  await txOrm.PlatformState.create(row);
}

async function persistAll(client: PgClient, db: Database): Promise<void> {
  await client.transaction(async (tx) => {
    const txOrm = (tx as unknown as { orm: { public: Record<string, OrmModel> } }).orm.public;
    for (const model of MODEL_ORDER) {
      try {
        await clearModel(txOrm, model);
      } catch {
        // Table may be missing until `prisma db init` has been run.
      }
    }
    for (const model of [...MODEL_ORDER].reverse()) {
      if (model === "PlatformState") {
        await persistPlatformState(txOrm, db);
        continue;
      }
      const rows = rowsForModel(db, model);
      if (!rows.length) continue;
      await txOrm[model].createAll(rows);
    }
  });
}
