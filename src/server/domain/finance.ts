import type {
  Database,
  OfferingStatus,
  Role,
  Subscription,
} from "./types";

export const OFFERING_TRANSITIONS: Record<OfferingStatus, OfferingStatus[]> = {
  DRAFT: ["INTERNAL_REVIEW", "CANCELLED"],
  INTERNAL_REVIEW: ["LEGAL_REVIEW", "DRAFT", "CANCELLED"],
  LEGAL_REVIEW: ["APPROVED", "INTERNAL_REVIEW", "CANCELLED"],
  APPROVED: ["SCHEDULED", "OPEN", "CANCELLED"],
  SCHEDULED: ["OPEN", "CANCELLED"],
  OPEN: ["PAUSED", "CLOSED", "CANCELLED", "FAILED_TO_REACH_MINIMUM"],
  PAUSED: ["OPEN", "CLOSED", "CANCELLED"],
  CLOSED: ["ALLOTMENT_PENDING", "FAILED_TO_REACH_MINIMUM", "CANCELLED"],
  ALLOTMENT_PENDING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  FAILED_TO_REACH_MINIMUM: [],
};

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  investor: ["profile.self", "subscribe", "vote", "support.create"],
  support_agent: ["investors.read", "support.manage"],
  kyc_officer: ["investors.read", "kyc.review"],
  project_analyst: ["projects.write", "issuers.write", "offerings.draft", "projects.read"],
  offering_approver: [
    "offerings.approve",
    "updates.publish",
    "projects.read",
    "allotments.approve",
    "investors.read",
  ],
  finance_officer: [
    "payments.manage",
    "ledger.read",
    "allotments.prepare",
    "dividends.prepare",
    "refunds.request",
    "projects.read",
  ],
  platform_admin: ["*"],
  issuer_manager: ["issuer.self", "dividends.declare"],
  auditor: ["audit.read", "reports.read", "investors.read", "projects.read", "ledger.read"],
};

export function can(roles: Role[], permission: string): boolean {
  return roles.some((role) => {
    const list = ROLE_PERMISSIONS[role];
    return list.includes("*") || list.includes(permission);
  });
}

export function canTransition(from: OfferingStatus, to: OfferingStatus): boolean {
  return OFFERING_TRANSITIONS[from].includes(to);
}

/** Completed years. A citizen can invest from their 18th birthday through the day they are still 35. */
export const MIN_INVESTOR_AGE = 18;
export const MAX_INVESTOR_AGE = 35;

export function completedAge(dateOfBirth: string, atIso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  const [atYear, atMonth, atDay] = atIso.slice(0, 10).split("-").map(Number);
  if (!atYear || !atMonth || !atDay) return null;
  let age = atYear - year;
  if (atMonth < month || (atMonth === month && atDay < day)) age -= 1;
  return age;
}

export function investorAgeCode(dateOfBirth: string | null | undefined, atIso: string): string | null {
  if (!dateOfBirth?.trim()) return "DATE_OF_BIRTH_REQUIRED";
  const age = completedAge(dateOfBirth, atIso);
  if (age === null) return "DATE_OF_BIRTH_INVALID";
  if (age < MIN_INVESTOR_AGE) return "AGE_TOO_YOUNG";
  if (age > MAX_INVESTOR_AGE) return "AGE_TOO_OLD";
  return null;
}

export interface QuoteInput {
  amountMinor: number;
  issuePriceMinor: number;
  fractionalSharesAllowed: boolean;
  minimumSubscriptionMinor: number;
  maximumSubscriptionMinor: number;
  minimumShares: number;
  maximumShares: number;
  feeMinor: number;
}

export type Quote =
  | {
      ok: true;
      shareQuantity: number;
      grossMinor: number;
      feeMinor: number;
      totalMinor: number;
      issuePriceMinor: number;
      remainderMinor: number;
    }
  | { ok: false; error: string };

/** Server-side share quote. Whole shares only unless the offering explicitly allows fractions. */
export function quoteSubscription(input: QuoteInput): Quote {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    return { ok: false, error: "AMOUNT_INVALID" };
  }
  if (!Number.isInteger(input.issuePriceMinor) || input.issuePriceMinor <= 0) {
    return { ok: false, error: "AMOUNT_INVALID" };
  }
  if (input.amountMinor < input.minimumSubscriptionMinor) {
    return { ok: false, error: "AMOUNT_BELOW_MIN" };
  }
  if (input.amountMinor > input.maximumSubscriptionMinor) {
    return { ok: false, error: "AMOUNT_ABOVE_MAX" };
  }
  const shareQuantity = Math.floor(input.amountMinor / input.issuePriceMinor);
  const grossMinor = shareQuantity * input.issuePriceMinor;
  const remainderMinor = input.amountMinor - grossMinor;
  if (!input.fractionalSharesAllowed && remainderMinor !== 0) {
    return { ok: false, error: "NOT_WHOLE_SHARES" };
  }
  if (shareQuantity < input.minimumShares || shareQuantity > input.maximumShares) {
    return { ok: false, error: "SHARE_LIMIT" };
  }
  const feeMinor = input.feeMinor;
  return {
    ok: true,
    shareQuantity,
    grossMinor,
    feeMinor,
    totalMinor: grossMinor + feeMinor,
    issuePriceMinor: input.issuePriceMinor,
    remainderMinor,
  };
}

export interface FundingProgress {
  initiatedMinor: number;
  confirmedMinor: number;
  settledMinor: number;
  allottedMinor: number;
  currencyCode: string;
}

const OPEN_SUBSCRIPTION: Subscription["status"][] = [
  "PENDING_PAYMENT",
  "PAID_AWAITING_CLOSING",
  "ALLOTTED",
];

export function fundingProgress(db: Database, offeringId: string): FundingProgress {
  const offering = db.offerings.find((item) => item.id === offeringId);
  const currencyCode = offering?.currencyCode ?? "USD";
  const subs = db.subscriptions.filter(
    (item) => item.offeringId === offeringId && OPEN_SUBSCRIPTION.includes(item.status),
  );
  const initiatedMinor = subs.reduce((sum, item) => sum + item.amountMinor, 0);
  const confirmedMinor = subs
    .filter((item) => item.status === "PAID_AWAITING_CLOSING" || item.status === "ALLOTTED")
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const settledMinor = db.payments
    .filter(
      (payment) =>
        payment.status === "SETTLED" &&
        subs.some((item) => item.id === payment.subscriptionId),
    )
    .reduce((sum, payment) => sum + payment.amountMinor, 0);
  const allottedMinor = db.shareIssuances
    .filter((item) => item.offeringId === offeringId && item.status === "ISSUED")
    .reduce((sum, item) => sum + item.shareQuantity * item.issuePriceMinor, 0);
  return { initiatedMinor, confirmedMinor, settledMinor, allottedMinor, currencyCode };
}

export function holdingQuantity(
  db: Database,
  investorProfileId: string,
  issuerId: string,
  shareClassId: string,
  at?: string,
): number {
  return db.shareholdingEvents
    .filter(
      (event) =>
        event.investorProfileId === investorProfileId &&
        event.issuerId === issuerId &&
        event.shareClassId === shareClassId &&
        (!at || event.effectiveAt <= at),
    )
    .reduce((sum, event) => sum + event.shareQuantityDelta, 0);
}

export function issuedQuantity(
  db: Database,
  issuerId: string,
  shareClassId: string,
  at?: string,
): number {
  return db.shareholdingEvents
    .filter(
      (event) =>
        event.issuerId === issuerId &&
        event.shareClassId === shareClassId &&
        (!at || event.effectiveAt <= at),
    )
    .reduce((sum, event) => sum + event.shareQuantityDelta, 0);
}

export function dividendAmounts(
  shares: number,
  perShareMinor: number,
  withholdingBps: number,
): { gross: number; withholding: number; net: number } {
  if (!Number.isInteger(shares) || !Number.isInteger(perShareMinor) || !Number.isInteger(withholdingBps)) {
    throw new Error("DIVIDEND_PRECISION");
  }
  const gross = shares * perShareMinor;
  const withholding = Math.floor((gross * withholdingBps) / 10_000);
  return { gross, withholding, net: gross - withholding };
}

export function allocationTotalBps(parts: number[]): number {
  return parts.reduce((sum, part) => sum + part, 0);
}

export function ledgerBalances(db: Database): Record<string, { debit: number; credit: number }> {
  const byCurrency: Record<string, { debit: number; credit: number }> = {};
  for (const entry of db.ledgerEntries) {
    const bucket = byCurrency[entry.currencyCode] ?? { debit: 0, credit: 0 };
    bucket.debit += entry.debitMinor;
    bucket.credit += entry.creditMinor;
    byCurrency[entry.currencyCode] = bucket;
  }
  return byCurrency;
}

export function transactionBalances(db: Database): { id: string; currency: string; debit: number; credit: number }[] {
  return db.ledgerTransactions.map((tx) => {
    const entries = db.ledgerEntries.filter((entry) => entry.ledgerTransactionId === tx.id);
    return {
      id: tx.id,
      currency: entries[0]?.currencyCode ?? "",
      debit: entries.reduce((sum, entry) => sum + entry.debitMinor, 0),
      credit: entries.reduce((sum, entry) => sum + entry.creditMinor, 0),
    };
  });
}

export function rolesFor(db: Database, userId: string): Role[] {
  return db.userRoles.filter((item) => item.userId === userId).map((item) => item.role);
}

export function isStaff(roles: Role[]): boolean {
  return roles.some((role) => role !== "investor");
}
