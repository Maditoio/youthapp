import { assert, AppError } from "./errors";
import {
  can,
  canTransition,
  dividendAmounts,
  holdingQuantity,
  investorAgeCode,
  issuedQuantity,
  quoteSubscription,
  rolesFor,
} from "./finance";
import { digest, hashCode, hashPassword, randomDigits, uid, verifyCode, verifyPassword } from "./crypto";
import type { Database, InheritanceStatus, KycStatus, Locale, OfferingStatus, Role } from "./types";
import { DEMO_NOW } from "./types";
import { isGender, isIndustry, isPermittedCountry } from "@/lib/choices";
import {
  encodeKycReviewNotes,
  isKycReasonCode,
  isKycReviewDecision,
  isRequestableDocumentType,
  kycReasonLabel,
  requestableDocumentLabel,
} from "@/lib/kyc-decisions";

const PHONE = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Roles that can be assigned when adding staff (excludes investor / issuer_manager). */
export const ASSIGNABLE_STAFF_ROLES: Role[] = [
  "platform_admin",
  "kyc_officer",
  "finance_officer",
  "project_analyst",
  "offering_approver",
  "support_agent",
  "auditor",
];

export const INHERITANCE_NEXT: Record<InheritanceStatus, InheritanceStatus[]> = {
  REPORTED: ["EVIDENCE_REQUESTED", "SUSPENDED", "DISPUTED", "REJECTED"],
  EVIDENCE_REQUESTED: ["UNDER_LEGAL_REVIEW", "SUSPENDED", "DISPUTED", "REJECTED"],
  UNDER_LEGAL_REVIEW: ["APPROVAL_PENDING", "EVIDENCE_REQUESTED", "SUSPENDED", "DISPUTED", "REJECTED"],
  APPROVAL_PENDING: ["APPROVED", "REJECTED", "SUSPENDED", "DISPUTED"],
  APPROVED: ["REGISTER_UPDATE_PENDING", "SUSPENDED", "DISPUTED"],
  REGISTER_UPDATE_PENDING: ["COMPLETED", "SUSPENDED", "DISPUTED"],
  REJECTED: [],
  COMPLETED: [],
  SUSPENDED: ["UNDER_LEGAL_REVIEW", "DISPUTED", "REJECTED"],
  DISPUTED: ["UNDER_LEGAL_REVIEW", "SUSPENDED", "REJECTED"],
};

export function now(db: Database): string {
  return db.clock || DEMO_NOW;
}

/** Next INV-n from the highest existing number (length-based codes collide after gaps/deletes). */
function nextInvestorNumber(db: Database): string {
  let max = 1000;
  for (const profile of db.investorProfiles) {
    const match = /^INV-(\d+)$/i.exec(profile.investorNumber.trim());
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `INV-${max + 1}`;
}

function audit(
  db: Database,
  actorUserId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  reason?: string,
) {
  db.auditLogs.push({
    id: uid(),
    actorUserId,
    action,
    resourceType,
    resourceId,
    reason: reason ?? null,
    createdAt: now(db),
  });
}

function notify(
  db: Database,
  userId: string,
  templateKey: string,
  titleFr: string,
  titleEn: string,
  bodyFr: string,
  bodyEn: string,
) {
  db.notifications.unshift({
    id: uid(),
    userId,
    channel: "IN_APP",
    templateKey,
    titleFr,
    titleEn,
    bodyFr,
    bodyEn,
    status: "UNREAD",
    createdAt: now(db),
  });
}

function requireUser(db: Database, userId: string) {
  const user = db.users.find((item) => item.id === userId);
  assert(user && user.accountStatus === "ACTIVE", "FORBIDDEN");
  return user;
}

function requirePermission(db: Database, userId: string, permission: string) {
  const user = requireUser(db, userId);
  assert(can(rolesFor(db, userId), permission), "FORBIDDEN");
  return user;
}

/**
 * Issue a unique 6-digit staff confirmation code.
 * Hash is used for verification; plaintext is stored as mfaCodeDisplay for Admin → Personnel.
 */
export function issueStaffConfirmationCode(db: Database): { code: string; hash: string } {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const code = randomDigits();
    const hash = hashCode(code);
    const taken = db.staffProfiles.some(
      (item) => item.mfaCodeDisplay === code || item.mfaCodeHash === hash,
    );
    if (!taken) return { code, hash };
  }
  throw new AppError("INVALID_STATE");
}

function nextStaffNumber(db: Database): string {
  let max = 0;
  for (const profile of db.staffProfiles) {
    const match = /^STF-(\d+)$/i.exec(profile.staffNumber.trim());
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `STF-${max + 1}`;
}

function activateStaffProfile(db: Database, userId: string, actorUserId: string | null, action: string) {
  const existing = db.staffProfiles.find((item) => item.userId === userId);
  if (existing) {
    if (existing.status !== "ACTIVE") existing.status = "ACTIVE";
    if (!existing.mfaCodeDisplay || !existing.mfaCodeHash) {
      const issued = issueStaffConfirmationCode(db);
      existing.mfaCodeHash = issued.hash;
      existing.mfaCodeDisplay = issued.code;
      audit(db, actorUserId, "staff.code_backfilled", "staff_profile", existing.id);
    }
    return existing;
  }
  const issued = issueStaffConfirmationCode(db);
  const profile = {
    id: uid(),
    userId,
    staffNumber: nextStaffNumber(db),
    status: "ACTIVE" as const,
    mfaCodeHash: issued.hash,
    mfaCodeDisplay: issued.code,
    createdAt: now(db),
  };
  db.staffProfiles.push(profile);
  audit(db, actorUserId, action, "staff_profile", profile.id);
  return profile;
}

/**
 * Sensitive-action confirmation: account password if the user has one, otherwise that staff member's MFA code.
 * Clerk-only admins have null passwordHash — they must use their per-staff confirmation code.
 */
function stepUp(db: Database, userId: string, secret: string) {
  const user = requireUser(db, userId);
  const trimmed = secret.trim();
  assert(trimmed.length > 0, "STEP_UP_FAILED");
  if (user.passwordHash) {
    assert(verifyPassword(trimmed, user.passwordHash), "STEP_UP_FAILED");
    return;
  }
  ensureStaffStepUpProfile(db, userId);
  const staff = db.staffProfiles.find((item) => item.userId === userId && item.status === "ACTIVE");
  assert(staff && verifyCode(trimmed, staff.mfaCodeHash), "STEP_UP_FAILED");
}

/** Non-investor roles without a local password get an MFA profile so step-up still works (Clerk admins). */
function ensureStaffStepUpProfile(db: Database, userId: string): void {
  const active = db.staffProfiles.find((item) => item.userId === userId && item.status === "ACTIVE");
  if (active) {
    if (!active.mfaCodeDisplay || !active.mfaCodeHash) {
      const issued = issueStaffConfirmationCode(db);
      active.mfaCodeHash = issued.hash;
      active.mfaCodeDisplay = issued.code;
      audit(db, userId, "staff.code_backfilled", "staff_profile", active.id);
    }
    return;
  }
  const roles = rolesFor(db, userId);
  if (roles.length === 0 || roles.every((role) => role === "investor")) return;
  activateStaffProfile(db, userId, userId, "staff.step_up_provisioned");
}

/** Platform admin: activate an existing user as staff with a role and a unique confirmation code. */
export function createStaffMember(
  db: Database,
  actorId: string,
  input: { email: string; role: Role },
): { staffId: string; staffNumber: string; mfaCodeDisplay: string } {
  requirePermission(db, actorId, "*");
  assert(ASSIGNABLE_STAFF_ROLES.includes(input.role), "FORBIDDEN");
  const email = input.email.trim().toLowerCase();
  assert(EMAIL.test(email), "INVALID_EMAIL");
  const user = db.users.find((item) => item.email === email && item.accountStatus === "ACTIVE");
  assert(user, "NOT_FOUND");
  if (!db.userRoles.some((item) => item.userId === user.id && item.role === input.role)) {
    db.userRoles.push({
      id: uid(),
      userId: user.id,
      role: input.role,
      scopeType: "PLATFORM",
      scopeId: null,
      assignedBy: actorId,
      createdAt: now(db),
    });
    audit(db, actorId, "staff.role_assigned", "user", user.id, input.role);
  }
  const profile = activateStaffProfile(db, user.id, actorId, "staff.created");
  return {
    staffId: profile.id,
    staffNumber: profile.staffNumber,
    mfaCodeDisplay: profile.mfaCodeDisplay,
  };
}

/** Platform admin: rotate a staff member's confirmation code (audited). */
export function rotateStaffConfirmationCode(
  db: Database,
  actorId: string,
  staffId: string,
): { mfaCodeDisplay: string } {
  requirePermission(db, actorId, "*");
  const profile = db.staffProfiles.find((item) => item.id === staffId);
  assert(profile, "NOT_FOUND");
  const issued = issueStaffConfirmationCode(db);
  profile.mfaCodeHash = issued.hash;
  profile.mfaCodeDisplay = issued.code;
  audit(db, actorId, "staff.code_rotated", "staff_profile", profile.id);
  return { mfaCodeDisplay: issued.code };
}

function postBalanced(
  db: Database,
  input: {
    type: string;
    sourceType: string;
    sourceId: string;
    amountMinor: number;
    currencyCode: string;
    debitAccountId: string;
    creditAccountId: string;
    actorUserId: string | null;
  },
) {
  assert(input.amountMinor > 0 && Number.isInteger(input.amountMinor), "AMOUNT_INVALID");
  const transactionId = uid();
  const at = now(db);
  db.ledgerTransactions.push({
    id: transactionId,
    reference: `LED-${transactionId.slice(0, 8)}`,
    transactionType: input.type,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    status: "POSTED",
    effectiveAt: at,
    createdAt: at,
    createdBy: input.actorUserId,
  });
  db.ledgerEntries.push({
    id: uid(),
    ledgerTransactionId: transactionId,
    ledgerAccountId: input.debitAccountId,
    debitMinor: input.amountMinor,
    creditMinor: 0,
    currencyCode: input.currencyCode,
    createdAt: at,
  });
  db.ledgerEntries.push({
    id: uid(),
    ledgerTransactionId: transactionId,
    ledgerAccountId: input.creditAccountId,
    debitMinor: 0,
    creditMinor: input.amountMinor,
    currencyCode: input.currencyCode,
    createdAt: at,
  });
}

export function registerUser(
  db: Database,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    country: string;
    language: Locale;
    acceptTerms: boolean;
    gender: string;
    dateOfBirth: string;
  },
): { userId: string; code: string } {
  assert(input.acceptTerms, "TERMS_REQUIRED");
  assert(input.password.length >= 10, "WEAK_PASSWORD");
  assert(EMAIL.test(input.email.trim().toLowerCase()), "INVALID_EMAIL");
  assert(PHONE.test(input.phone.trim()), "INVALID_PHONE");
  assert(isPermittedCountry(input.country), "COUNTRY_INVALID");
  assert(isGender(input.gender), "GENDER_REQUIRED");
  const ageCode = investorAgeCode(input.dateOfBirth, now(db));
  assert(!ageCode, ageCode ?? "DATE_OF_BIRTH_REQUIRED");
  const email = input.email.trim().toLowerCase();
  assert(!db.users.some((user) => user.email === email), "EMAIL_TAKEN");
  const at = now(db);
  const userId = uid();
  const code = randomDigits();
  db.users.push({
    id: userId,
    email,
    phone: input.phone.trim(),
    passwordHash: hashPassword(input.password),
    preferredLanguage: input.language,
    accountStatus: "ACTIVE",
    emailVerifiedAt: null,
    countryOfResidence: input.country,
    gender: input.gender,
    legalFirstName: input.firstName.trim(),
    legalLastName: input.lastName.trim(),
    createdAt: at,
    updatedAt: at,
  });
  db.authIdentities.push({
    id: uid(),
    userId,
    provider: "password",
    providerSubject: email,
    verifiedEmailAt: null,
    linkedAt: at,
  });
  db.emailVerifications.push({
    id: uid(),
    userId,
    email,
    codeHash: hashCode(code),
    status: "PENDING",
    expiresAt: new Date(Date.parse(at) + 30 * 60 * 1000).toISOString(),
    verifiedAt: null,
    createdAt: at,
  });
  const profileId = uid();
  db.investorProfiles.push({
    id: profileId,
    userId,
    investorNumber: nextInvestorNumber(db),
    legalFirstName: input.firstName.trim(),
    legalMiddleName: "",
    legalLastName: input.lastName.trim(),
    dateOfBirth: input.dateOfBirth.trim(),
    countryOfResidence: input.country,
    gender: input.gender,
    nationality: null,
    addressLine: null,
    city: null,
    taxResidency: null,
    taxId: null,
    sourceOfFunds: null,
    pepStatus: "UNKNOWN",
    onboardingStatus: "NOT_STARTED",
    payoutLabel: null,
    createdAt: at,
    updatedAt: at,
  });
  db.kycCases.push({
    id: uid(),
    investorProfileId: profileId,
    status: "NOT_STARTED",
    riskReviewStatus: "NOT_STARTED",
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reasonCode: null,
    reviewNotes: null,
    createdAt: at,
    updatedAt: at,
  });
  db.userRoles.push({
    id: uid(),
    userId,
    role: "investor",
    scopeType: "PLATFORM",
    scopeId: null,
    assignedBy: null,
    createdAt: at,
  });
  audit(db, userId, "user.register", "user", userId);
  return { userId, code };
}

export function verifyEmail(db: Database, email: string, code: string): string {
  const user = db.users.find((item) => item.email === email.trim().toLowerCase());
  assert(user, "INVALID_CODE");
  const pending = [...db.emailVerifications]
    .reverse()
    .find((item) => item.userId === user.id && item.status === "PENDING");
  assert(pending, "INVALID_CODE");
  assert(pending.expiresAt >= now(db), "INVALID_CODE");
  assert(verifyCode(code.trim(), pending.codeHash), "INVALID_CODE");
  pending.status = "VERIFIED";
  pending.verifiedAt = now(db);
  user.emailVerifiedAt = now(db);
  user.updatedAt = now(db);
  const identity = db.authIdentities.find(
    (item) => item.userId === user.id && item.provider === "password",
  );
  if (identity) identity.verifiedEmailAt = now(db);
  audit(db, user.id, "email.verify", "user", user.id);
  notify(
    db,
    user.id,
    "email.verified",
    "E-mail vérifié",
    "Email verified",
    "Votre adresse est vérifiée. La vérification d'identité reste obligatoire avant toute souscription.",
    "Your address is verified. Identity verification is still required before any subscription.",
  );
  return user.id;
}

export function resendEmailCode(db: Database, email: string): { userId: string; code: string } | null {
  const user = db.users.find((item) => item.email === email.trim().toLowerCase());
  if (!user || user.emailVerifiedAt) return null;
  const code = randomDigits();
  for (const item of db.emailVerifications) {
    if (item.userId === user.id && item.status === "PENDING") item.status = "EXPIRED";
  }
  db.emailVerifications.push({
    id: uid(),
    userId: user.id,
    email: user.email,
    codeHash: hashCode(code),
    status: "PENDING",
    expiresAt: new Date(Date.parse(now(db)) + 30 * 60 * 1000).toISOString(),
    verifiedAt: null,
    createdAt: now(db),
  });
  return { userId: user.id, code };
}

export function authenticate(
  db: Database,
  email: string,
  password: string,
): { userId: string; needsMfa: boolean } {
  const key = email.trim().toLowerCase();
  const recent = db.loginAttempts.filter(
    (item) => item.email === key && !item.success && Date.parse(now(db)) - Date.parse(item.at) < 15 * 60 * 1000,
  );
  assert(recent.length < 8, "RATE_LIMITED");
  const user = db.users.find((item) => item.email === key && item.accountStatus === "ACTIVE");
  const ok = Boolean(user && verifyPassword(password, user.passwordHash));
  db.loginAttempts.push({ email: key, at: now(db), success: ok });
  assert(ok && user, "INVALID_CREDENTIALS");
  const staff = db.staffProfiles.find((item) => item.userId === user.id && item.status === "ACTIVE");
  audit(db, user.id, staff ? "auth.password_ok_mfa_pending" : "auth.sign_in", "user", user.id);
  return { userId: user.id, needsMfa: Boolean(staff) };
}

export function verifyStaffMfa(db: Database, userId: string, code: string): void {
  const staff = db.staffProfiles.find((item) => item.userId === userId && item.status === "ACTIVE");
  assert(staff, "MFA_REQUIRED");
  assert(verifyCode(code.trim(), staff.mfaCodeHash), "INVALID_CODE");
  audit(db, userId, "auth.mfa", "user", userId);
}

export function linkOrCreateGoogle(
  db: Database,
  sessionUserId: string | null,
  asserted: { email: string; subject: string; emailVerified: boolean },
): { userId: string; created: boolean } {
  assert(asserted.emailVerified, "EMAIL_UNVERIFIED");
  const email = asserted.email.trim().toLowerCase();
  const existingIdentity = db.authIdentities.find(
    (item) => item.provider === "google" && item.providerSubject === asserted.subject,
  );
  if (existingIdentity) return { userId: existingIdentity.userId, created: false };
  const user = db.users.find((item) => item.email === email);
  if (!user) {
    const at = now(db);
    const userId = uid();
    db.users.push({
      id: userId,
      email,
      phone: null,
      passwordHash: null,
      preferredLanguage: "fr",
      accountStatus: "ACTIVE",
      emailVerifiedAt: at,
      countryOfResidence: null,
      gender: null,
      legalFirstName: "Google",
      legalLastName: "Démo",
      createdAt: at,
      updatedAt: at,
    });
    db.authIdentities.push({
      id: uid(),
      userId,
      provider: "google",
      providerSubject: asserted.subject,
      verifiedEmailAt: at,
      linkedAt: at,
    });
    const profileId = uid();
    db.investorProfiles.push({
      id: profileId,
      userId,
      investorNumber: nextInvestorNumber(db),
      legalFirstName: "Google",
      legalMiddleName: "",
      legalLastName: "Démo",
      dateOfBirth: null,
      countryOfResidence: null,
      gender: null,
      nationality: null,
      addressLine: null,
      city: null,
      taxResidency: null,
      taxId: null,
      sourceOfFunds: null,
      pepStatus: "UNKNOWN",
      onboardingStatus: "NOT_STARTED",
      payoutLabel: null,
      createdAt: at,
      updatedAt: at,
    });
    db.kycCases.push({
      id: uid(),
      investorProfileId: profileId,
      status: "NOT_STARTED",
      riskReviewStatus: "NOT_STARTED",
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      reasonCode: null,
      reviewNotes: null,
      createdAt: at,
      updatedAt: at,
    });
    db.userRoles.push({
      id: uid(),
      userId,
      role: "investor",
      scopeType: "PLATFORM",
      scopeId: null,
      assignedBy: null,
      createdAt: at,
    });
    audit(db, userId, "auth.google_create", "user", userId, "sandbox identity provider");
    return { userId, created: true };
  }
  const passwordIdentity = db.authIdentities.some(
    (item) => item.userId === user.id && item.provider === "password",
  );
  if (passwordIdentity && sessionUserId !== user.id) {
    throw new AppError("ACCOUNT_LINK_REQUIRED");
  }
  assert(sessionUserId === user.id, "ACCOUNT_LINK_REQUIRED");
  db.authIdentities.push({
    id: uid(),
    userId: user.id,
    provider: "google",
    providerSubject: asserted.subject,
    verifiedEmailAt: now(db),
    linkedAt: now(db),
  });
  if (!user.emailVerifiedAt) user.emailVerifiedAt = now(db);
  audit(db, user.id, "auth.google_link", "user", user.id);
  return { userId: user.id, created: false };
}

export type ClerkProfileSeed = {
  phone?: string;
  country?: string;
  gender?: string;
  dateOfBirth?: string;
  language?: Locale;
};

/** Emails listed in ADMIN_EMAILS (comma-separated) receive platform_admin without wiping investor. */
export function ensureBootstrapAdmin(db: Database, userId: string, email: string): void {
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (!allow.includes(email.trim().toLowerCase())) return;
  if (!db.userRoles.some((item) => item.userId === userId && item.role === "platform_admin")) {
    db.userRoles.push({
      id: uid(),
      userId,
      role: "platform_admin",
      scopeType: "PLATFORM",
      scopeId: null,
      assignedBy: null,
      createdAt: now(db),
    });
    audit(db, userId, "auth.bootstrap_admin", "user", userId);
  }
  // Clerk-only bootstrap admins have no passwordHash — provision staff MFA for step-up.
  ensureStaffStepUpProfile(db, userId);
}

export function linkOrCreateClerk(
  db: Database,
  input: {
    clerkUserId: string;
    email: string;
    firstName: string;
    lastName: string;
    profile?: ClerkProfileSeed;
  },
): { userId: string; created: boolean } {
  const email = input.email.trim().toLowerCase();
  assert(EMAIL.test(email), "INVALID_EMAIL");
  const existing = db.authIdentities.find(
    (item) => item.provider === "clerk" && item.providerSubject === input.clerkUserId,
  );
  if (existing) {
    if (input.profile) applyClerkProfileSeed(db, existing.userId, input.profile, input.firstName, input.lastName);
    ensureBootstrapAdmin(db, existing.userId, email);
    return { userId: existing.userId, created: false };
  }
  const named = {
    first: input.firstName.trim() || email.split("@")[0] || "Jeunese",
    last: input.lastName.trim() || "—",
  };
  const user = db.users.find((item) => item.email === email);
  const at = now(db);
  if (user) {
    db.authIdentities.push({
      id: uid(),
      userId: user.id,
      provider: "clerk",
      providerSubject: input.clerkUserId,
      verifiedEmailAt: at,
      linkedAt: at,
    });
    if (!user.emailVerifiedAt) user.emailVerifiedAt = at;
    if (input.profile) applyClerkProfileSeed(db, user.id, input.profile, named.first, named.last);
    ensureBootstrapAdmin(db, user.id, email);
    audit(db, user.id, "auth.clerk_link", "user", user.id);
    return { userId: user.id, created: false };
  }
  const seed = input.profile ?? {};
  if (seed.phone) assert(PHONE.test(seed.phone.trim()), "INVALID_PHONE");
  if (seed.country) assert(isPermittedCountry(seed.country), "COUNTRY_INVALID");
  if (seed.gender) assert(isGender(seed.gender), "GENDER_REQUIRED");
  if (seed.dateOfBirth) {
    const ageCode = investorAgeCode(seed.dateOfBirth, now(db));
    assert(!ageCode, ageCode ?? "DATE_OF_BIRTH_REQUIRED");
  }
  const gender = seed.gender && isGender(seed.gender) ? seed.gender : null;
  const country = seed.country && isPermittedCountry(seed.country) ? seed.country : null;
  const language: Locale = seed.language === "en" ? "en" : "fr";
  const userId = uid();
  db.users.push({
    id: userId,
    email,
    phone: seed.phone?.trim() || null,
    passwordHash: null,
    preferredLanguage: language,
    accountStatus: "ACTIVE",
    emailVerifiedAt: at,
    countryOfResidence: country,
    gender,
    legalFirstName: named.first,
    legalLastName: named.last,
    createdAt: at,
    updatedAt: at,
  });
  db.authIdentities.push({
    id: uid(),
    userId,
    provider: "clerk",
    providerSubject: input.clerkUserId,
    verifiedEmailAt: at,
    linkedAt: at,
  });
  const profileId = uid();
  db.investorProfiles.push({
    id: profileId,
    userId,
    investorNumber: nextInvestorNumber(db),
    legalFirstName: named.first,
    legalMiddleName: "",
    legalLastName: named.last,
    dateOfBirth: seed.dateOfBirth?.trim() || null,
    countryOfResidence: country,
    gender,
    nationality: null,
    addressLine: null,
    city: null,
    taxResidency: null,
    taxId: null,
    sourceOfFunds: null,
    pepStatus: "UNKNOWN",
    onboardingStatus: "NOT_STARTED",
    payoutLabel: null,
    createdAt: at,
    updatedAt: at,
  });
  db.kycCases.push({
    id: uid(),
    investorProfileId: profileId,
    status: "NOT_STARTED",
    riskReviewStatus: "NOT_STARTED",
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reasonCode: null,
    reviewNotes: null,
    createdAt: at,
    updatedAt: at,
  });
  db.userRoles.push({
    id: uid(),
    userId,
    role: "investor",
    scopeType: "PLATFORM",
    scopeId: null,
    assignedBy: null,
    createdAt: at,
  });
  ensureBootstrapAdmin(db, userId, email);
  audit(db, userId, "auth.clerk_create", "user", userId);
  return { userId, created: true };
}

function applyClerkProfileSeed(
  db: Database,
  userId: string,
  seed: ClerkProfileSeed,
  firstName: string,
  lastName: string,
) {
  const user = db.users.find((item) => item.id === userId);
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  if (!user || !profile) return;
  if (seed.phone) {
    assert(PHONE.test(seed.phone.trim()), "INVALID_PHONE");
    user.phone = seed.phone.trim();
  }
  if (seed.country) {
    assert(isPermittedCountry(seed.country), "COUNTRY_INVALID");
    user.countryOfResidence = seed.country;
    profile.countryOfResidence = seed.country;
  }
  if (seed.gender) {
    assert(isGender(seed.gender), "GENDER_REQUIRED");
    user.gender = seed.gender;
    profile.gender = seed.gender;
  }
  if (seed.dateOfBirth) {
    const ageCode = investorAgeCode(seed.dateOfBirth, now(db));
    assert(!ageCode, ageCode ?? "DATE_OF_BIRTH_REQUIRED");
    profile.dateOfBirth = seed.dateOfBirth.trim();
  }
  if (seed.language === "en" || seed.language === "fr") user.preferredLanguage = seed.language;
  if (firstName.trim()) {
    user.legalFirstName = firstName.trim();
    profile.legalFirstName = firstName.trim();
  }
  if (lastName.trim()) {
    user.legalLastName = lastName.trim();
    profile.legalLastName = lastName.trim();
  }
  user.updatedAt = now(db);
  profile.updatedAt = now(db);
}

/** Profile fields required before an investor leaves /investor/onboarding. Does not approve KYC. */
export function isInvestorOnboardingComplete(db: Database, userId: string): boolean {
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  if (!profile) return false;
  if (profile.onboardingStatus === "NOT_STARTED") return false;
  if (!profile.legalFirstName.trim() || !profile.legalLastName.trim()) return false;
  if (!profile.countryOfResidence || !isPermittedCountry(profile.countryOfResidence)) return false;
  if (!profile.gender || !isGender(profile.gender)) return false;
  return investorAgeCode(profile.dateOfBirth, now(db)) === null;
}

/** Finish eligibility profile without approving identity/KYC. */
export function completeInvestorOnboarding(
  db: Database,
  userId: string,
  input: {
    firstName: string;
    middleName: string;
    lastName: string;
    phone: string;
    country: string;
    language: Locale;
    dateOfBirth: string;
    nationality: string;
    addressLine: string;
    city: string;
    taxResidency: string;
    taxId: string;
    sourceOfFunds: string;
    pepStatus: "NO" | "YES";
    payoutLabel: string;
    gender: string;
  },
): void {
  assert(input.firstName.trim() && input.lastName.trim(), "PROFILE_INCOMPLETE");
  assert(input.dateOfBirth.trim(), "DATE_OF_BIRTH_REQUIRED");
  const ageCode = investorAgeCode(input.dateOfBirth, now(db));
  assert(!ageCode, ageCode ?? "DATE_OF_BIRTH_REQUIRED");
  updateInvestorDetails(db, userId, input);
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  assert(profile, "NOT_FOUND");
  const kyc = db.kycCases.find((item) => item.investorProfileId === profile.id);
  if (kyc) {
    kyc.status = "NOT_STARTED";
    kyc.updatedAt = now(db);
  }
  if (profile.onboardingStatus === "NOT_STARTED") profile.onboardingStatus = "IN_PROGRESS";
  audit(db, userId, "investor.onboarding_complete", "investor_profile", profile.id);
}

export function updateInvestorDetails(
  db: Database,
  userId: string,
  input: {
    firstName: string;
    middleName: string;
    lastName: string;
    phone: string;
    country: string;
    language: Locale;
    dateOfBirth: string;
    nationality: string;
    addressLine: string;
    city: string;
    taxResidency: string;
    taxId: string;
    sourceOfFunds: string;
    pepStatus: "NO" | "YES";
    payoutLabel: string;
    gender: string;
  },
): void {
  const user = requireUser(db, userId);
  assert(PHONE.test(input.phone.trim()), "INVALID_PHONE");
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  assert(profile, "NOT_FOUND");
  assert(isPermittedCountry(input.country), "COUNTRY_INVALID");
  assert(!input.nationality || isPermittedCountry(input.nationality), "COUNTRY_INVALID");
  assert(!input.taxResidency || isPermittedCountry(input.taxResidency), "COUNTRY_INVALID");
  assert(isGender(input.gender), "GENDER_REQUIRED");
  if (input.dateOfBirth.trim()) {
    const ageCode = investorAgeCode(input.dateOfBirth, now(db));
    assert(ageCode === null, ageCode ?? "DATE_OF_BIRTH_INVALID");
  }
  user.phone = input.phone.trim();
  user.countryOfResidence = input.country;
  user.gender = input.gender;
  user.preferredLanguage = input.language;
  user.legalFirstName = input.firstName.trim();
  user.legalLastName = input.lastName.trim();
  user.updatedAt = now(db);
  profile.legalFirstName = input.firstName.trim();
  profile.legalMiddleName = input.middleName.trim();
  profile.legalLastName = input.lastName.trim();
  profile.countryOfResidence = input.country;
  profile.gender = input.gender;
  profile.dateOfBirth = input.dateOfBirth || null;
  profile.nationality = input.nationality || null;
  profile.addressLine = input.addressLine || null;
  profile.city = input.city || null;
  profile.taxResidency = input.taxResidency || null;
  profile.taxId = input.taxId || null;
  profile.sourceOfFunds = input.sourceOfFunds || null;
  profile.pepStatus = input.pepStatus;
  profile.payoutLabel = input.payoutLabel || null;
  profile.updatedAt = now(db);
  if (profile.onboardingStatus === "NOT_STARTED") profile.onboardingStatus = "IN_PROGRESS";
  // Profile edits never advance or approve KYC — only document submit + staff review do.
  audit(db, userId, "investor.profile_update", "investor_profile", profile.id);
}

export function submitIdentityDocument(
  db: Database,
  userId: string,
  input: {
    documentType: string;
    issuingCountry: string;
    documentNumber: string;
    expiryDate: string;
  },
): { manualReviewRequired: boolean } {
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  assert(profile, "NOT_FOUND");
  assert(profile.countryOfResidence, "PROFILE_INCOMPLETE");
  const policy = db.identityPolicies.find(
    (item) => item.countryCode === profile.countryOfResidence && item.enabled,
  );
  const accepted = policy?.acceptedDocumentTypes.includes(input.documentType) ?? false;
  const countryMatch = input.issuingCountry === profile.countryOfResidence;
  const manualReviewRequired = !accepted || !countryMatch;
  const kyc = db.kycCases.find((item) => item.investorProfileId === profile.id);
  assert(kyc, "NOT_FOUND");
  assert(
    kyc.status !== "APPROVED" && kyc.status !== "SUSPENDED" && kyc.status !== "REJECTED",
    "INVALID_STATE",
  );
  const resubmit = kyc.status === "ADDITIONAL_INFORMATION_REQUIRED";
  const at = now(db);
  db.kycDocuments.push({
    id: uid(),
    kycCaseId: kyc.id,
    issuingCountryCode: input.issuingCountry,
    documentType: input.documentType,
    documentNumber: input.documentNumber.trim(),
    expiryDate: input.expiryDate || null,
    manualReviewRequired,
    verificationStatus: "PENDING",
    storageKey: `private/kyc/${profile.id}/${uid()}`,
    mimeType: "application/octet-stream",
    checksum: digest(`${input.documentType}:${input.documentNumber}`),
    reviewedBy: null,
    reviewedAt: null,
    rejectionReasonCode: null,
    uploadedAt: at,
  });
  kyc.status = "SUBMITTED";
  kyc.submittedAt = at;
  kyc.updatedAt = at;
  kyc.reviewedAt = null;
  kyc.reviewedBy = null;
  kyc.reasonCode = manualReviewRequired ? "MANUAL_REVIEW" : resubmit ? "RESUBMITTED" : null;
  kyc.reviewNotes = resubmit ? null : kyc.reviewNotes;
  profile.onboardingStatus = "SUBMITTED";
  profile.updatedAt = at;
  audit(db, userId, "kyc.submit", "kyc_case", kyc.id, manualReviewRequired ? "manual review" : "queued");
  notify(
    db,
    userId,
    "kyc.submitted",
    "Documents soumis",
    "Documents submitted",
    resubmit
      ? "Vos nouveaux documents ont été envoyés. Une revue humaine est encore nécessaire."
      : "Votre dossier d'identité a été soumis. Une revue humaine est encore nécessaire.",
    resubmit
      ? "Your new documents were sent. A human review is still required."
      : "Your identity case was submitted. A human review is still required.",
  );
  return { manualReviewRequired };
}

export function reviewKyc(
  db: Database,
  actorId: string,
  caseId: string,
  decision: Extract<KycStatus, "APPROVED" | "REJECTED" | "ADDITIONAL_INFORMATION_REQUIRED" | "SUSPENDED">,
  reasonCode: string,
  notes: string,
  password: string,
  requestedDocumentTypes: string[] = [],
): void {
  requirePermission(db, actorId, "kyc.review");
  stepUp(db, actorId, password);
  const kyc = db.kycCases.find((item) => item.id === caseId);
  assert(kyc, "NOT_FOUND");
  const profile = db.investorProfiles.find((item) => item.id === kyc.investorProfileId);
  assert(profile, "NOT_FOUND");
  assert(profile.userId !== actorId, "MAKER_CHECKER");
  assert(isKycReviewDecision(decision), "INVALID_STATE");
  assert(isKycReasonCode(decision, reasonCode.trim()), "INVALID_STATE");
  const requested = requestedDocumentTypes.map((item) => item.trim()).filter(isRequestableDocumentType);
  if (decision === "ADDITIONAL_INFORMATION_REQUIRED") {
    assert(requested.length > 0, "INVALID_STATE");
  }
  const at = now(db);
  kyc.status = decision === "APPROVED" ? "UNDER_REVIEW" : decision;
  if (decision === "APPROVED") {
    const doc = [...db.kycDocuments].reverse().find((item) => item.kycCaseId === kyc.id);
    assert(doc, "INVALID_STATE");
    assert(!doc.manualReviewRequired || notes.trim().length > 8, "INVALID_STATE");
    doc.verificationStatus = "APPROVED";
    doc.reviewedBy = actorId;
    doc.reviewedAt = at;
    kyc.status = "APPROVED";
    kyc.riskReviewStatus = profile.pepStatus === "YES" ? "ESCALATED" : "CLEAR";
    if (profile.pepStatus === "YES") {
      kyc.status = "UNDER_REVIEW";
      profile.onboardingStatus = "UNDER_REVIEW";
    }
  }
  if (decision === "REJECTED") {
    const doc = [...db.kycDocuments].reverse().find((item) => item.kycCaseId === kyc.id);
    if (doc) {
      doc.verificationStatus = "REJECTED";
      doc.rejectionReasonCode = reasonCode.trim();
      doc.reviewedBy = actorId;
      doc.reviewedAt = at;
    }
  }
  kyc.reviewedAt = at;
  kyc.reviewedBy = actorId;
  kyc.reasonCode = reasonCode.trim();
  kyc.reviewNotes = encodeKycReviewNotes(
    notes,
    decision === "ADDITIONAL_INFORMATION_REQUIRED" ? requested : [],
  );
  kyc.updatedAt = at;
  if (kyc.status === "APPROVED") profile.onboardingStatus = "APPROVED";
  if (decision !== "APPROVED") profile.onboardingStatus = decision;
  profile.updatedAt = at;
  audit(db, actorId, `kyc.${kyc.status.toLowerCase()}`, "kyc_case", kyc.id, reasonCode.trim());
  const status = profile.onboardingStatus;
  const copy = kycDecisionNotifyCopy(status, reasonCode.trim(), notes, requested);
  notify(db, profile.userId, "kyc.status", copy.titleFr, copy.titleEn, copy.bodyFr, copy.bodyEn);
}

function kycDecisionNotifyCopy(
  status: KycStatus,
  reasonCode: string,
  notes: string,
  requestedDocumentTypes: string[] = [],
): { titleFr: string; titleEn: string; bodyFr: string; bodyEn: string } {
  const note = notes.trim();
  const reasonFr = kycReasonLabel("fr", isKycReviewDecision(status) ? status : null, reasonCode);
  const reasonEn = kycReasonLabel("en", isKycReviewDecision(status) ? status : null, reasonCode);
  const docsFr = requestedDocumentTypes.map((code) => requestableDocumentLabel("fr", code)).join(", ");
  const docsEn = requestedDocumentTypes.map((code) => requestableDocumentLabel("en", code)).join(", ");
  if (status === "APPROVED") {
    return {
      titleFr: "Identité approuvée",
      titleEn: "Identity approved",
      bodyFr: "Votre vérification d'identité est approuvée. Vous pouvez souscrire aux offres éligibles.",
      bodyEn: "Your identity verification is approved. You can subscribe to eligible offerings.",
    };
  }
  if (status === "ADDITIONAL_INFORMATION_REQUIRED") {
    return {
      titleFr: "Documents complémentaires requis",
      titleEn: "Additional documents required",
      bodyFr: `Motif : ${reasonFr}.${docsFr ? ` Documents : ${docsFr}.` : ""}${note ? ` ${note}` : ""} Retournez à la vérification pour déposer de nouveaux documents.`,
      bodyEn: `Reason: ${reasonEn}.${docsEn ? ` Documents: ${docsEn}.` : ""}${note ? ` ${note}` : ""} Return to verification to upload new documents.`,
    };
  }
  if (status === "REJECTED") {
    return {
      titleFr: "Vérification refusée",
      titleEn: "Verification rejected",
      bodyFr: `Motif : ${reasonFr}.${note ? ` ${note}` : ""}`,
      bodyEn: `Reason: ${reasonEn}.${note ? ` ${note}` : ""}`,
    };
  }
  if (status === "SUSPENDED") {
    return {
      titleFr: "Vérification suspendue",
      titleEn: "Verification suspended",
      bodyFr: `Motif : ${reasonFr}.${note ? ` ${note}` : ""}`,
      bodyEn: `Reason: ${reasonEn}.${note ? ` ${note}` : ""}`,
    };
  }
  return {
    titleFr: "Mise à jour de vérification",
    titleEn: "Verification update",
    bodyFr: `Statut : ${status}. Motif : ${reasonFr}.`,
    bodyEn: `Status: ${status}. Reason: ${reasonEn}.`,
  };
}

export function saveNextOfKin(
  db: Database,
  userId: string,
  input: { id?: string; fullName: string; relationship: string; email: string; phone: string; gender: string },
): string {
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  assert(profile, "NOT_FOUND");
  assert(isGender(input.gender), "KIN_FIELDS");
  assert(
    input.fullName.trim() && input.relationship.trim() && EMAIL.test(input.email) && PHONE.test(input.phone),
    "KIN_FIELDS",
  );
  const at = now(db);
  if (input.id) {
    const row = db.nextOfKin.find((item) => item.id === input.id && item.investorProfileId === profile.id);
    assert(row, "NOT_FOUND");
    row.fullName = input.fullName.trim();
    row.relationship = input.relationship.trim();
    row.gender = input.gender;
    row.email = input.email.trim().toLowerCase();
    row.phone = input.phone.trim();
    row.updatedAt = at;
    audit(db, userId, "kin.update", "next_of_kin", row.id);
    return row.id;
  }
  const id = uid();
  db.nextOfKin.push({
    id,
    investorProfileId: profile.id,
    fullName: input.fullName.trim(),
    relationship: input.relationship.trim(),
    gender: input.gender,
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    createdAt: at,
    updatedAt: at,
  });
  audit(db, userId, "kin.create", "next_of_kin", id);
  return id;
}

export function removeNextOfKin(db: Database, userId: string, kinId: string): void {
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  assert(profile, "NOT_FOUND");
  const index = db.nextOfKin.findIndex(
    (item) => item.id === kinId && item.investorProfileId === profile.id,
  );
  assert(index >= 0, "NOT_FOUND");
  db.nextOfKin.splice(index, 1);
  audit(db, userId, "kin.delete", "next_of_kin", kinId);
}

export function saveNomination(
  db: Database,
  userId: string,
  input: {
    activate: boolean;
    acknowledgement: boolean;
    people: { fullName: string; relationship: string; email: string; phone: string; bps: number; gender: string }[];
  },
): string {
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  assert(profile, "NOT_FOUND");
  const total = input.people.reduce((sum, person) => sum + person.bps, 0);
  if (input.activate) {
    assert(input.acknowledgement, "TERMS_REQUIRED");
    assert(total === 10_000, "ALLOCATION_NOT_100");
    for (const person of input.people) {
      assert(
        person.fullName.trim() &&
          person.relationship.trim() &&
          isGender(person.gender) &&
          EMAIL.test(person.email) &&
          PHONE.test(person.phone) &&
          Number.isInteger(person.bps) &&
          person.bps > 0,
        "KIN_FIELDS",
      );
    }
  }
  const version =
    db.nominationSets.filter((item) => item.investorProfileId === profile.id).reduce((max, item) => Math.max(max, item.version), 0) +
    1;
  const id = uid();
  const at = now(db);
  if (input.activate) {
    for (const set of db.nominationSets) {
      if (set.investorProfileId === profile.id && set.status === "ACTIVE") set.status = "SUPERSEDED";
    }
  }
  db.nominationSets.push({
    id,
    investorProfileId: profile.id,
    scopeType: "ALL_HOLDINGS_WISHES",
    scopeId: null,
    version,
    status: input.activate ? "ACTIVE" : "DRAFT",
    totalBps: total,
    acknowledgement: input.acknowledgement,
    activatedAt: input.activate ? at : null,
    createdAt: at,
  });
  for (const person of input.people) {
    db.allocations.push({
      id: uid(),
      nominationSetId: id,
      fullName: person.fullName.trim(),
      relationship: person.relationship.trim(),
      gender: isGender(person.gender) ? person.gender : null,
      email: person.email.trim().toLowerCase(),
      phone: person.phone.trim(),
      allocationBps: person.bps,
      createdAt: at,
    });
  }
  audit(
    db,
    userId,
    input.activate ? "beneficiary.activate" : "beneficiary.draft",
    "nomination_set",
    id,
    "Statement of wishes. Not a transfer of shares.",
  );
  return id;
}

export function reportDeath(
  db: Database,
  actorId: string,
  investorProfileId: string,
  jurisdiction: string,
  notes: string,
): string {
  const before = db.shareholdingEvents.length;
  assert(isPermittedCountry(jurisdiction), "COUNTRY_INVALID");
  const profile = db.investorProfiles.find((item) => item.id === investorProfileId);
  assert(profile, "NOT_FOUND");
  const actor = requireUser(db, actorId);
  const isOwner = profile.userId === actor.id;
  const staff = can(rolesFor(db, actorId), "kyc.review") || can(rolesFor(db, actorId), "*");
  assert(isOwner || staff, "FORBIDDEN");
  const id = uid();
  db.inheritanceCases.push({
    id,
    deceasedInvestorProfileId: profile.id,
    reportedBy: actorId,
    status: "REPORTED",
    jurisdiction,
    assignedReviewerId: null,
    approvedBy: null,
    secondApprovedBy: null,
    legalEvidenceReference: null,
    notes,
    openedAt: now(db),
    closedAt: null,
    registerUpdated: false,
  });
  assert(db.shareholdingEvents.length === before, "NO_TRANSFER");
  audit(db, actorId, "inheritance.report", "inheritance_case", id, "No share transfer");
  return id;
}

export function advanceInheritance(
  db: Database,
  actorId: string,
  caseId: string,
  to: InheritanceStatus,
  notes: string,
  password: string,
): void {
  requirePermission(db, actorId, "kyc.review");
  stepUp(db, actorId, password);
  const item = db.inheritanceCases.find((row) => row.id === caseId);
  assert(item, "NOT_FOUND");
  assert(INHERITANCE_NEXT[item.status].includes(to), "INVALID_STATE");
  assert(to !== "COMPLETED", "NO_TRANSFER");
  if (to === "APPROVED") {
    assert(item.approvedBy && item.secondApprovedBy, "MAKER_CHECKER");
    assert(item.approvedBy !== item.secondApprovedBy, "MAKER_CHECKER");
  }
  item.status = to;
  item.notes = notes || item.notes;
  if (to === "REJECTED") item.closedAt = now(db);
  audit(db, actorId, `inheritance.${to.toLowerCase()}`, "inheritance_case", item.id, notes);
}

export function addInheritanceApproval(
  db: Database,
  actorId: string,
  caseId: string,
  evidence: string,
  password: string,
): void {
  const actorRoles = rolesFor(db, actorId);
  assert(can(actorRoles, "*") || can(actorRoles, "allotments.approve") || can(actorRoles, "kyc.review"), "FORBIDDEN");
  stepUp(db, actorId, password);
  const item = db.inheritanceCases.find((row) => row.id === caseId);
  assert(item, "NOT_FOUND");
  assert(item.status === "APPROVAL_PENDING" || item.status === "UNDER_LEGAL_REVIEW", "INVALID_STATE");
  assert(item.reportedBy !== actorId, "MAKER_CHECKER");
  assert(evidence.trim().length > 3, "INVALID_STATE");
  if (!item.approvedBy) {
    item.approvedBy = actorId;
    item.legalEvidenceReference = evidence.trim();
    item.status = "APPROVAL_PENDING";
  } else if (item.approvedBy !== actorId && !item.secondApprovedBy) {
    item.secondApprovedBy = actorId;
    item.status = "APPROVED";
  } else {
    throw new AppError("MAKER_CHECKER");
  }
  assert(db.shareholdingEvents.every((event) => event.relatedTransferId !== item.id), "NO_TRANSFER");
  audit(db, actorId, "inheritance.approval", "inheritance_case", item.id, evidence);
}

export function recordInheritanceRegisterUpdate(
  db: Database,
  actorId: string,
  caseId: string,
  fromProfileId: string,
  toProfileId: string,
  shareClassId: string,
  quantity: number,
  password: string,
): void {
  requirePermission(db, actorId, "*");
  stepUp(db, actorId, password);
  const item = db.inheritanceCases.find((row) => row.id === caseId);
  assert(item, "NOT_FOUND");
  assert(item.status === "APPROVED" || item.status === "REGISTER_UPDATE_PENDING", "INVALID_STATE");
  assert(item.approvedBy && item.secondApprovedBy && item.approvedBy !== item.secondApprovedBy, "MAKER_CHECKER");
  assert(actorId !== item.approvedBy && actorId !== item.secondApprovedBy, "MAKER_CHECKER");
  assert(item.deceasedInvestorProfileId === fromProfileId, "INVALID_STATE");
  const shareClass = db.shareClasses.find((row) => row.id === shareClassId);
  assert(shareClass, "NOT_FOUND");
  const held = holdingQuantity(db, fromProfileId, shareClass.issuerId, shareClassId);
  assert(Number.isInteger(quantity) && quantity > 0 && quantity <= held, "SHARE_LIMIT");
  const at = now(db);
  db.shareholdingEvents.push(
    {
      id: uid(),
      issuerId: shareClass.issuerId,
      shareClassId,
      investorProfileId: fromProfileId,
      eventType: "TRANSFER_OUT",
      shareQuantityDelta: -quantity,
      relatedIssuanceId: null,
      relatedTransferId: item.id,
      effectiveAt: at,
      recordedAt: at,
      recordedBy: actorId,
      evidenceDocumentId: null,
    },
    {
      id: uid(),
      issuerId: shareClass.issuerId,
      shareClassId,
      investorProfileId: toProfileId,
      eventType: "TRANSFER_IN",
      shareQuantityDelta: quantity,
      relatedIssuanceId: null,
      relatedTransferId: item.id,
      effectiveAt: at,
      recordedAt: at,
      recordedBy: actorId,
      evidenceDocumentId: null,
    },
  );
  item.status = "COMPLETED";
  item.registerUpdated = true;
  item.closedAt = at;
  audit(db, actorId, "inheritance.register_update", "inheritance_case", item.id, "Dual approval already recorded");
}

export function eligibilityErrors(db: Database, userId: string, offeringId: string): string[] {
  const errors: string[] = [];
  const user = db.users.find((item) => item.id === userId);
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  const offering = db.offerings.find((item) => item.id === offeringId);
  if (!user || !profile || !offering) return ["NOT_FOUND"];
  if (!user.emailVerifiedAt) errors.push("EMAIL_UNVERIFIED");
  if (!user.phone || !profile.countryOfResidence) errors.push("PROFILE_INCOMPLETE");
  if (profile.onboardingStatus !== "APPROVED") errors.push("KYC_REQUIRED");
  if (offering.status !== "OPEN") errors.push("OFFERING_UNAVAILABLE");
  if (now(db) < offering.opensAt || now(db) > offering.closesAt) errors.push("OFFERING_UNAVAILABLE");
  if (profile.countryOfResidence && !offering.permittedCountries.includes(profile.countryOfResidence)) {
    errors.push("JURISDICTION_BLOCKED");
  }
  const ageCode = investorAgeCode(profile.dateOfBirth, now(db));
  if (ageCode) errors.push(ageCode);
  return errors;
}

export function createSubscription(
  db: Database,
  userId: string,
  input: {
    offeringId: string;
    amountMinor: number;
    documentIds: string[];
    riskAccepted: boolean;
  },
): string {
  const blockers = eligibilityErrors(db, userId, input.offeringId);
  if (blockers.length) throw new AppError(blockers[0]);
  assert(input.riskAccepted, "RISK_ACK_REQUIRED");
  const profile = db.investorProfiles.find((item) => item.userId === userId)!;
  const offering = db.offerings.find((item) => item.id === input.offeringId)!;
  const terms = db.offeringShareTerms.find((item) => item.offeringId === offering.id);
  assert(terms, "NOT_FOUND");
  const docs = db.offeringDocuments.filter(
    (item) => item.offeringId === offering.id && item.visibility === "PUBLIC",
  );
  assert(docs.every((doc) => input.documentIds.includes(doc.id)), "DOCUMENTS_REQUIRED");
  const quote = quoteSubscription({
    amountMinor: input.amountMinor,
    issuePriceMinor: terms.issuePriceMinor,
    fractionalSharesAllowed: terms.fractionalSharesAllowed,
    minimumSubscriptionMinor: offering.minimumSubscriptionMinor,
    maximumSubscriptionMinor: offering.maximumSubscriptionMinor,
    minimumShares: terms.minimumSharesPerInvestor,
    maximumShares: terms.maximumSharesPerInvestor,
    feeMinor: offering.feeMinor,
  });
  if (!quote.ok) throw new AppError(quote.error);
  const already = db.subscriptions
    .filter(
      (item) =>
        item.investorProfileId === profile.id &&
        item.offeringId === offering.id &&
        item.status !== "CANCELLED" &&
        item.status !== "REFUNDED" &&
        item.status !== "EXPIRED",
    )
    .reduce((sum, item) => sum + item.shareQuantity, 0);
  assert(already + quote.shareQuantity <= terms.maximumSharesPerInvestor, "SHARE_LIMIT");
  const issued = issuedQuantity(db, offering.issuerId, terms.shareClassId);
    const reserved = db.subscriptions
    .filter(
      (item) =>
        item.offeringId === offering.id &&
        (item.status === "PENDING_PAYMENT" || item.status === "PAID_AWAITING_CLOSING"),
    )
    .reduce((sum, item) => sum + item.shareQuantity, 0);
  assert(issued + reserved + quote.shareQuantity <= terms.sharesOffered, "SHARE_LIMIT");
  const at = now(db);
  const id = uid();
  const holdingsBefore = db.shareholdingEvents.length;
  db.subscriptions.push({
    id,
    investorProfileId: profile.id,
    offeringId: offering.id,
    shareClassId: terms.shareClassId,
    reference: `SUB-${id.slice(0, 8).toUpperCase()}`,
    currencyCode: offering.currencyCode,
    amountMinor: quote.grossMinor,
    shareQuantity: quote.shareQuantity,
    issuePriceMinor: quote.issuePriceMinor,
    feeMinor: quote.feeMinor,
    totalMinor: quote.totalMinor,
    status: "PENDING_PAYMENT",
    termsVersion: offering.termsVersion,
    acceptedAt: at,
    createdAt: at,
    updatedAt: at,
  });
  for (const doc of docs) {
    db.subscriptionAcceptances.push({
      id: uid(),
      subscriptionId: id,
      documentId: doc.id,
      documentVersion: doc.version,
      acceptedAt: at,
      evidenceHash: digest(`${userId}:${doc.id}:${doc.version}:${at}`),
      acceptanceMethod: "ELECTRONIC_CLICK",
    });
  }
  assert(db.shareholdingEvents.length === holdingsBefore, "NO_TRANSFER");
  audit(db, userId, "subscription.create", "subscription", id, offering.termsVersion);
  notify(
    db,
    userId,
    "subscription.pending",
    "Souscription en attente de paiement",
    "Subscription awaiting payment",
    "Le paiement de démonstration n'émet pas d'actions.",
    "The demo payment does not issue shares.",
  );
  return id;
}

export function cancelSubscription(db: Database, userId: string, subscriptionId: string): void {
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  assert(profile, "NOT_FOUND");
  const sub = db.subscriptions.find((item) => item.id === subscriptionId && item.investorProfileId === profile.id);
  assert(sub, "NOT_FOUND");
  assert(sub.status === "PENDING_PAYMENT", "INVALID_STATE");
  sub.status = "CANCELLED";
  sub.updatedAt = now(db);
  audit(db, userId, "subscription.cancel", "subscription", sub.id);
}

export function applySandboxPayment(
  db: Database,
  input: { providerEventId: string; providerTransactionId: string; subscriptionId: string; amountMinor: number; currencyCode: string },
): { duplicate: boolean } {
  if (db.payments.some((item) => item.providerEventId === input.providerEventId)) {
    return { duplicate: true };
  }
  const sub = db.subscriptions.find((item) => item.id === input.subscriptionId);
  assert(sub, "NOT_FOUND");
  assert(sub.status === "PENDING_PAYMENT", "INVALID_STATE");
  assert(sub.totalMinor === input.amountMinor && sub.currencyCode === input.currencyCode, "AMOUNT_INVALID");
  const holdingsBefore = db.shareholdingEvents.length;
  const at = now(db);
  db.payments.push({
    id: uid(),
    subscriptionId: sub.id,
    provider: "sandbox",
    providerTransactionId: input.providerTransactionId,
    providerEventId: input.providerEventId,
    currencyCode: input.currencyCode,
    amountMinor: input.amountMinor,
    status: "CONFIRMED",
    initiatedAt: at,
    confirmedAt: at,
    settledAt: null,
    createdAt: at,
  });
  sub.status = "PAID_AWAITING_CLOSING";
  sub.updatedAt = at;
  postBalanced(db, {
    type: "SUBSCRIPTION_ESCROW",
    sourceType: "payment",
    sourceId: input.providerEventId,
    amountMinor: input.amountMinor,
    currencyCode: input.currencyCode,
    debitAccountId: "acct-escrow-usd",
    creditAccountId: "acct-payable-usd",
    actorUserId: null,
  });
  assert(db.shareholdingEvents.length === holdingsBefore, "NO_TRANSFER");
  const profile = db.investorProfiles.find((item) => item.id === sub.investorProfileId);
  if (profile) {
    notify(
      db,
      profile.userId,
      "payment.confirmed",
      "Paiement de démonstration confirmé",
      "Demo payment confirmed",
      "Les fonds sont suivis. Les actions ne sont pas encore émises.",
      "Funds are tracked. Shares are not issued yet.",
    );
  }
  audit(db, profile?.userId ?? null, "payment.confirmed", "subscription", sub.id, input.providerEventId);
  return { duplicate: false };
}

export function settlePayment(db: Database, actorId: string, paymentId: string): void {
  requirePermission(db, actorId, "payments.manage");
  const payment = db.payments.find((item) => item.id === paymentId);
  assert(payment && payment.status === "CONFIRMED", "INVALID_STATE");
  payment.status = "SETTLED";
  payment.settledAt = now(db);
  audit(db, actorId, "payment.settle", "payment", payment.id);
}

export function requestRefund(
  db: Database,
  actorId: string,
  paymentId: string,
  reasonCode: string,
): string {
  requirePermission(db, actorId, "refunds.request");
  const payment = db.payments.find((item) => item.id === paymentId);
  assert(payment && (payment.status === "CONFIRMED" || payment.status === "SETTLED"), "INVALID_STATE");
  const sub = db.subscriptions.find((item) => item.id === payment.subscriptionId);
  assert(sub && sub.status === "PAID_AWAITING_CLOSING", "INVALID_STATE");
  assert(!db.refunds.some((item) => item.paymentTransactionId === payment.id && item.status !== "REJECTED"), "INVALID_STATE");
  const id = uid();
  db.refunds.push({
    id,
    paymentTransactionId: payment.id,
    amountMinor: payment.amountMinor,
    currencyCode: payment.currencyCode,
    reasonCode,
    status: "REQUESTED",
    requestedBy: actorId,
    approvedBy: null,
    createdAt: now(db),
    completedAt: null,
  });
  audit(db, actorId, "refund.request", "refund", id, reasonCode);
  return id;
}

export function approveRefund(db: Database, actorId: string, refundId: string, password: string): void {
  requirePermission(db, actorId, "*");
  stepUp(db, actorId, password);
  const refund = db.refunds.find((item) => item.id === refundId);
  assert(refund && refund.status === "REQUESTED", "INVALID_STATE");
  assert(refund.requestedBy !== actorId, "MAKER_CHECKER");
  const payment = db.payments.find((item) => item.id === refund.paymentTransactionId);
  const sub = payment && db.subscriptions.find((item) => item.id === payment.subscriptionId);
  assert(payment && sub && sub.status === "PAID_AWAITING_CLOSING", "INVALID_STATE");
  refund.status = "COMPLETED";
  refund.approvedBy = actorId;
  refund.completedAt = now(db);
  payment.status = "REFUNDED";
  sub.status = "REFUNDED";
  sub.updatedAt = now(db);
  postBalanced(db, {
    type: "SUBSCRIPTION_REFUND",
    sourceType: "refund",
    sourceId: refund.id,
    amountMinor: refund.amountMinor,
    currencyCode: refund.currencyCode,
    debitAccountId: "acct-payable-usd",
    creditAccountId: "acct-escrow-usd",
    actorUserId: actorId,
  });
  audit(db, actorId, "refund.approve", "refund", refund.id, refund.reasonCode);
}

export function prepareAllotment(
  db: Database,
  actorId: string,
  offeringId: string,
  subscriptionIds: string[],
): string {
  requirePermission(db, actorId, "allotments.prepare");
  const offering = db.offerings.find((item) => item.id === offeringId);
  assert(offering, "NOT_FOUND");
  assert(["OPEN", "CLOSED", "ALLOTMENT_PENDING"].includes(offering.status), "INVALID_STATE");
  assert(subscriptionIds.length > 0, "INVALID_STATE");
  const subs = subscriptionIds.map((id) => db.subscriptions.find((item) => item.id === id));
  assert(subs.every((item) => item && item.offeringId === offeringId && item.status === "PAID_AWAITING_CLOSING"), "INVALID_STATE");
  const terms = db.offeringShareTerms.find((item) => item.offeringId === offeringId)!;
  const issued = issuedQuantity(db, offering.issuerId, terms.shareClassId);
  const batchShares = subs.reduce((sum, item) => sum + (item?.shareQuantity ?? 0), 0);
  assert(issued + batchShares <= terms.sharesOffered, "SHARE_LIMIT");
  const id = uid();
  db.allotmentBatches.push({
    id,
    issuerId: offering.issuerId,
    offeringId,
    status: "PREPARED",
    preparedBy: actorId,
    approvedBy: null,
    approvedAt: null,
    registerEvidenceReference: null,
    subscriptionIds,
    createdAt: now(db),
  });
  audit(db, actorId, "allotment.prepare", "allotment_batch", id);
  return id;
}

export function approveAllotment(
  db: Database,
  actorId: string,
  batchId: string,
  evidence: string,
  password: string,
): void {
  requirePermission(db, actorId, "allotments.approve");
  stepUp(db, actorId, password);
  const batch = db.allotmentBatches.find((item) => item.id === batchId);
  assert(batch && batch.status === "PREPARED", "INVALID_STATE");
  assert(batch.preparedBy !== actorId, "MAKER_CHECKER");
  assert(evidence.trim().length > 3, "INVALID_STATE");
  const terms = db.offeringShareTerms.find((item) => item.offeringId === batch.offeringId)!;
  const at = now(db);
  for (const subscriptionId of batch.subscriptionIds) {
    const sub = db.subscriptions.find((item) => item.id === subscriptionId);
    assert(sub && sub.status === "PAID_AWAITING_CLOSING", "INVALID_STATE");
    const issuanceId = uid();
    db.shareIssuances.push({
      id: issuanceId,
      issuerId: batch.issuerId,
      shareClassId: sub.shareClassId,
      offeringId: sub.offeringId,
      allotmentBatchId: batch.id,
      investorProfileId: sub.investorProfileId,
      subscriptionId: sub.id,
      shareQuantity: sub.shareQuantity,
      issuePriceMinor: sub.issuePriceMinor,
      currencyCode: sub.currencyCode,
      allotmentDate: at.slice(0, 10),
      registerReference: evidence.trim(),
      status: "ISSUED",
      createdAt: at,
    });
    db.shareholdingEvents.push({
      id: uid(),
      issuerId: batch.issuerId,
      shareClassId: sub.shareClassId,
      investorProfileId: sub.investorProfileId,
      eventType: "ISSUANCE",
      shareQuantityDelta: sub.shareQuantity,
      relatedIssuanceId: issuanceId,
      relatedTransferId: null,
      effectiveAt: at,
      recordedAt: at,
      recordedBy: actorId,
      evidenceDocumentId: null,
    });
    const held = holdingQuantity(db, sub.investorProfileId, batch.issuerId, sub.shareClassId);
    assert(held >= 0, "SHARE_LIMIT");
    assert(issuedQuantity(db, batch.issuerId, terms.shareClassId) <= terms.sharesOffered, "SHARE_LIMIT");
    sub.status = "ALLOTTED";
    sub.updatedAt = at;
    releaseCompanyFinancing(db, actorId, batch.issuerId, batch.offeringId, batch.id, sub.id);
    const profile = db.investorProfiles.find((item) => item.id === sub.investorProfileId);
    if (profile) {
      notify(
        db,
        profile.userId,
        "allotment.confirmed",
        "Actions de démonstration inscrites",
        "Demo shares recorded",
        "Une écriture d'émission a été ajoutée au registre de la plateforme. Ce n'est pas le registre statutaire légal.",
        "An issuance event was added to the platform register. This is not the statutory legal register.",
      );
    }
  }
  batch.status = "APPROVED";
  batch.approvedBy = actorId;
  batch.approvedAt = at;
  batch.registerEvidenceReference = evidence.trim();
  audit(db, actorId, "allotment.approve", "allotment_batch", batch.id, evidence);
}

function releaseCompanyFinancing(
  db: Database,
  actorId: string,
  issuerId: string,
  offeringId: string,
  batchId: string,
  subscriptionId: string,
) {
  if (db.companyFinancings.some((item) => item.subscriptionId === subscriptionId)) return;
  const payment = db.payments.find(
    (item) => item.subscriptionId === subscriptionId && (item.status === "CONFIRMED" || item.status === "SETTLED"),
  );
  assert(payment, "AMOUNT_INVALID");
  const offering = db.offerings.find((item) => item.id === offeringId);
  const project = offering && db.projects.find((item) => item.id === offering.projectId);
  const accountId = `acct-financing-${issuerId}`;
  if (!db.ledgerAccounts.some((item) => item.id === accountId)) {
    const issuer = db.issuers.find((item) => item.id === issuerId);
    db.ledgerAccounts.push({
      id: accountId,
      accountCode: "2100",
      accountName: `Company financing — ${issuer?.legalName ?? issuerId}`,
      accountType: "LIABILITY",
      currencyCode: payment.currencyCode,
      ownerType: "COMPANY_FINANCING",
      ownerId: issuerId,
      status: "ACTIVE",
    });
  }
  postBalanced(db, {
    type: "COMPANY_FINANCING",
    sourceType: "subscription",
    sourceId: subscriptionId,
    amountMinor: payment.amountMinor,
    currencyCode: payment.currencyCode,
    debitAccountId: "acct-payable-usd",
    creditAccountId: accountId,
    actorUserId: actorId,
  });
  db.companyFinancings.push({
    id: uid(),
    issuerId,
    projectId: project?.id ?? offering?.projectId ?? "",
    offeringId,
    allotmentBatchId: batchId,
    subscriptionId,
    purpose: project?.financingPurpose ?? "FINANCE",
    amountMinor: payment.amountMinor,
    currencyCode: payment.currencyCode,
    releasedAt: now(db),
    releasedBy: actorId,
  });
  audit(db, actorId, "financing.release", "subscription", subscriptionId, project?.financingPurpose ?? "FINANCE");
}

export function transitionOffering(
  db: Database,
  actorId: string,
  offeringId: string,
  to: OfferingStatus,
  reason: string,
): void {
  const offering = db.offerings.find((item) => item.id === offeringId);
  assert(offering, "NOT_FOUND");
  assert(canTransition(offering.status, to), "INVALID_STATE");
  const publishing = ["APPROVED", "SCHEDULED", "OPEN"].includes(to);
  if (publishing) {
    requirePermission(db, actorId, "offerings.approve");
    assert(offering.createdBy !== actorId, "MAKER_CHECKER");
    offering.approvedBy = actorId;
    offering.publishedAt = offering.publishedAt ?? now(db);
    const project = db.projects.find((item) => item.id === offering.projectId);
    if (project && to === "OPEN") project.status = "PUBLISHED";
  } else {
    assert(
      can(rolesFor(db, actorId), "offerings.draft") || can(rolesFor(db, actorId), "offerings.approve") || can(rolesFor(db, actorId), "*"),
      "FORBIDDEN",
    );
  }
  offering.status = to;
  offering.updatedAt = now(db);
  audit(db, actorId, `offering.${to.toLowerCase()}`, "offering", offering.id, reason);
}

function ensureOrdinaryShareClass(db: Database, issuerId: string, at: string): string {
  const existing = db.shareClasses.find((item) => item.issuerId === issuerId);
  if (existing) return existing.id;
  const id = uid();
  db.shareClasses.push({
    id,
    issuerId,
    className: "Actions ordinaires",
    classCode: "ORD",
    currencyCode: "USD",
    votingRightsFr: "Une voix par action.",
    votingRightsEn: "One vote per share.",
    dividendRightsFr: "Droit aux dividendes déclarés, s'il y en a.",
    dividendRightsEn: "Right to declared dividends, if any.",
    transferRestrictionsFr: "Cession soumise aux conditions de l'offre et de la société.",
    transferRestrictionsEn: "Transfers subject to the offering and company terms.",
    createdAt: at,
  });
  return id;
}

/** Creates an issuer company plus a default ordinary share class. */
export function createIssuer(
  db: Database,
  actorId: string,
  input: {
    legalName: string;
    tradingName?: string;
    registrationNumber: string;
    jurisdiction: string;
    legalForm: string;
    registeredAddress: string;
    industry: string;
    website?: string;
  },
): { issuerId: string; shareClassId: string } {
  requirePermission(db, actorId, "issuers.write");
  const legalName = input.legalName.trim();
  const registrationNumber = input.registrationNumber.trim();
  assert(legalName.length >= 2, "INVALID_STATE");
  assert(registrationNumber.length >= 2, "INVALID_STATE");
  assert(isIndustry(input.industry), "INDUSTRY_INVALID");
  assert(input.jurisdiction.trim().length >= 2, "INVALID_STATE");
  assert(input.legalForm.trim().length >= 2, "INVALID_STATE");
  assert(input.registeredAddress.trim().length >= 2, "INVALID_STATE");
  const at = now(db);
  const issuerId = uid();
  db.issuers.push({
    id: issuerId,
    legalName,
    tradingName: (input.tradingName ?? legalName).trim() || legalName,
    registrationNumber,
    jurisdiction: input.jurisdiction.trim(),
    legalForm: input.legalForm.trim(),
    registeredAddress: input.registeredAddress.trim(),
    industry: input.industry,
    companyStatus: "ACTIVE",
    website: (input.website ?? "").trim(),
    createdAt: at,
    updatedAt: at,
  });
  const shareClassId = ensureOrdinaryShareClass(db, issuerId, at);
  audit(db, actorId, "issuer.create", "issuer", issuerId);
  return { issuerId, shareClassId };
}

export function createDraftProject(
  db: Database,
  actorId: string,
  input: {
    issuerId: string;
    titleFr: string;
    titleEn: string;
    location: string;
    industry: string;
    minimumRaiseMinor: number;
    maximumRaiseMinor: number;
    issuePriceMinor: number;
    sharesOffered: number;
    financingPurpose: "START" | "FINANCE";
  },
): { projectId: string; offeringId: string } {
  requirePermission(db, actorId, "projects.write");
  assert(isIndustry(input.industry), "INDUSTRY_INVALID");
  assert(input.financingPurpose === "START" || input.financingPurpose === "FINANCE", "INVALID_STATE");
  const issuer = db.issuers.find((item) => item.id === input.issuerId);
  assert(issuer, "NOT_FOUND");
  const at = now(db);
  const projectId = uid();
  const offeringId = uid();
  const shareClassId = ensureOrdinaryShareClass(db, issuer.id, at);
  const slug = input.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || projectId;
  db.projects.push({
    id: projectId,
    issuerId: issuer.id,
    slug,
    titleFr: input.titleFr,
    titleEn: input.titleEn,
    shortFr: input.titleFr,
    shortEn: input.titleEn,
    fullFr: input.titleFr,
    fullEn: input.titleEn,
    marketFr: "",
    marketEn: "",
    industry: input.industry,
    locationName: input.location,
    status: "DRAFT",
    financingPurpose: input.financingPurpose,
    createdBy: actorId,
    useOfProceeds: [],
    team: [],
    risksFr: ["Projet fictif, non publié."],
    risksEn: ["Fictional draft, not published."],
    assumptionsFr: "",
    assumptionsEn: "",
    projectionsFr: "",
    projectionsEn: "",
    createdAt: at,
    updatedAt: at,
  });
  db.offerings.push({
    id: offeringId,
    projectId,
    issuerId: issuer.id,
    nameFr: input.titleFr,
    nameEn: input.titleEn,
    status: "DRAFT",
    currencyCode: "USD",
    minimumRaiseMinor: input.minimumRaiseMinor,
    maximumRaiseMinor: input.maximumRaiseMinor,
    minimumSubscriptionMinor: input.issuePriceMinor * 4,
    maximumSubscriptionMinor: input.issuePriceMinor * 200,
    opensAt: "2026-12-01T00:00:00.000Z",
    closesAt: "2027-03-01T00:00:00.000Z",
    termsVersion: "draft-1",
    createdBy: actorId,
    approvedBy: null,
    publishedAt: null,
    feeMinor: 0,
    preMoneyValuationMinor: null,
    permittedCountries: ["CD"],
    dividendPolicyFr: "Aucun dividende n'est garanti.",
    dividendPolicyEn: "No dividend is guaranteed.",
    transferRestrictionsFr: "Cession restreinte.",
    transferRestrictionsEn: "Transfer is restricted.",
    conditionsFr: "Revue interne requise.",
    conditionsEn: "Internal review required.",
    refundFr: "Selon les conditions qui seront approuvées.",
    refundEn: "According to terms that are later approved.",
    existingCap: [],
    createdAt: at,
    updatedAt: at,
  });
  db.offeringShareTerms.push({
    id: uid(),
    offeringId,
    shareClassId,
    issuePriceMinor: input.issuePriceMinor,
    sharesOffered: input.sharesOffered,
    maximumSharesPerInvestor: 200,
    minimumSharesPerInvestor: 4,
    fractionalSharesAllowed: false,
    shareQuantityPrecision: 0,
    createdAt: at,
  });
  audit(db, actorId, "project.create", "project", projectId);
  return { projectId, offeringId };
}

export type ProjectContentInput = {
  projectId: string;
  titleFr: string;
  titleEn: string;
  shortFr: string;
  shortEn: string;
  fullFr: string;
  fullEn: string;
  marketFr: string;
  marketEn: string;
  industry: string;
  locationName: string;
  financingPurpose: "START" | "FINANCE";
  status: "DRAFT" | "PUBLISHED";
  useOfProceeds: { labelFr: string; labelEn: string; amountMinor: number }[];
  team: { name: string; roleFr: string; roleEn: string; experienceFr: string; experienceEn: string }[];
  risksFr: string[];
  risksEn: string[];
  assumptionsFr: string;
  assumptionsEn: string;
  projectionsFr: string;
  projectionsEn: string;
};

export function updateProjectContent(db: Database, actorId: string, input: ProjectContentInput): void {
  requirePermission(db, actorId, "projects.write");
  const project = db.projects.find((item) => item.id === input.projectId);
  assert(project, "NOT_FOUND");
  assert(input.titleFr.trim() && input.titleEn.trim(), "INVALID_STATE");
  assert(isIndustry(input.industry), "INDUSTRY_INVALID");
  assert(input.financingPurpose === "START" || input.financingPurpose === "FINANCE", "INVALID_STATE");
  assert(input.status === "DRAFT" || input.status === "PUBLISHED", "INVALID_STATE");
  for (const line of input.useOfProceeds) {
    assert(line.amountMinor >= 0 && Number.isSafeInteger(line.amountMinor), "AMOUNT_INVALID");
  }
  project.titleFr = input.titleFr.trim();
  project.titleEn = input.titleEn.trim();
  project.shortFr = input.shortFr.trim();
  project.shortEn = input.shortEn.trim();
  project.fullFr = input.fullFr.trim();
  project.fullEn = input.fullEn.trim();
  project.marketFr = input.marketFr.trim();
  project.marketEn = input.marketEn.trim();
  project.industry = input.industry;
  project.locationName = input.locationName.trim();
  project.financingPurpose = input.financingPurpose;
  project.status = input.status;
  project.useOfProceeds = input.useOfProceeds;
  project.team = input.team;
  project.risksFr = input.risksFr;
  project.risksEn = input.risksEn;
  project.assumptionsFr = input.assumptionsFr.trim();
  project.assumptionsEn = input.assumptionsEn.trim();
  project.projectionsFr = input.projectionsFr.trim();
  project.projectionsEn = input.projectionsEn.trim();
  project.updatedAt = now(db);
  audit(db, actorId, "project.update", "project", project.id);
}

export type OfferingTermsInput = {
  offeringId: string;
  nameFr: string;
  nameEn: string;
  minimumRaiseMinor: number;
  maximumRaiseMinor: number;
  minimumSubscriptionMinor: number;
  maximumSubscriptionMinor: number;
  opensAt: string;
  closesAt: string;
  feeMinor: number;
  preMoneyValuationMinor: number | null;
  permittedCountries: string[];
  dividendPolicyFr: string;
  dividendPolicyEn: string;
  transferRestrictionsFr: string;
  transferRestrictionsEn: string;
  conditionsFr: string;
  conditionsEn: string;
  refundFr: string;
  refundEn: string;
  issuePriceMinor: number;
  sharesOffered: number;
  minimumSharesPerInvestor: number;
  maximumSharesPerInvestor: number;
};

export function updateOfferingTerms(db: Database, actorId: string, input: OfferingTermsInput): void {
  assert(
    can(rolesFor(db, actorId), "offerings.draft") ||
      can(rolesFor(db, actorId), "projects.write") ||
      can(rolesFor(db, actorId), "*"),
    "FORBIDDEN",
  );
  requireUser(db, actorId);
  const offering = db.offerings.find((item) => item.id === input.offeringId);
  assert(offering, "NOT_FOUND");
  assert(input.nameFr.trim() && input.nameEn.trim(), "INVALID_STATE");
  assert(input.minimumRaiseMinor > 0 && input.maximumRaiseMinor > 0, "AMOUNT_INVALID");
  assert(input.minimumRaiseMinor <= input.maximumRaiseMinor, "AMOUNT_INVALID");
  assert(input.minimumSubscriptionMinor > 0 && input.maximumSubscriptionMinor > 0, "AMOUNT_INVALID");
  assert(input.minimumSubscriptionMinor <= input.maximumSubscriptionMinor, "AMOUNT_INVALID");
  assert(input.issuePriceMinor > 0, "AMOUNT_INVALID");
  assert(input.feeMinor >= 0, "AMOUNT_INVALID");
  assert(
    input.preMoneyValuationMinor === null || input.preMoneyValuationMinor >= 0,
    "AMOUNT_INVALID",
  );
  assert(Number.isSafeInteger(input.sharesOffered) && input.sharesOffered > 0, "INVALID_STATE");
  assert(
    Number.isSafeInteger(input.minimumSharesPerInvestor) &&
      Number.isSafeInteger(input.maximumSharesPerInvestor) &&
      input.minimumSharesPerInvestor > 0 &&
      input.minimumSharesPerInvestor <= input.maximumSharesPerInvestor,
    "INVALID_STATE",
  );
  assert(Number.isFinite(Date.parse(input.opensAt)) && Number.isFinite(Date.parse(input.closesAt)), "INVALID_STATE");
  assert(input.opensAt < input.closesAt, "INVALID_STATE");
  assert(input.permittedCountries.length > 0, "INVALID_STATE");
  assert(input.permittedCountries.every((code) => isPermittedCountry(code)), "INVALID_STATE");

  offering.nameFr = input.nameFr.trim();
  offering.nameEn = input.nameEn.trim();
  offering.minimumRaiseMinor = input.minimumRaiseMinor;
  offering.maximumRaiseMinor = input.maximumRaiseMinor;
  offering.minimumSubscriptionMinor = input.minimumSubscriptionMinor;
  offering.maximumSubscriptionMinor = input.maximumSubscriptionMinor;
  offering.opensAt = input.opensAt;
  offering.closesAt = input.closesAt;
  offering.feeMinor = input.feeMinor;
  offering.preMoneyValuationMinor = input.preMoneyValuationMinor;
  offering.permittedCountries = input.permittedCountries;
  offering.dividendPolicyFr = input.dividendPolicyFr.trim();
  offering.dividendPolicyEn = input.dividendPolicyEn.trim();
  offering.transferRestrictionsFr = input.transferRestrictionsFr.trim();
  offering.transferRestrictionsEn = input.transferRestrictionsEn.trim();
  offering.conditionsFr = input.conditionsFr.trim();
  offering.conditionsEn = input.conditionsEn.trim();
  offering.refundFr = input.refundFr.trim();
  offering.refundEn = input.refundEn.trim();
  offering.updatedAt = now(db);

  const terms = db.offeringShareTerms.find((item) => item.offeringId === offering.id);
  assert(terms, "NOT_FOUND");
  terms.issuePriceMinor = input.issuePriceMinor;
  terms.sharesOffered = input.sharesOffered;
  terms.minimumSharesPerInvestor = input.minimumSharesPerInvestor;
  terms.maximumSharesPerInvestor = input.maximumSharesPerInvestor;

  audit(db, actorId, "offering.update_terms", "offering", offering.id);
}

export type OfferingDocumentInput = {
  documentId?: string;
  offeringId: string;
  documentType: string;
  version: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  visibility: "PUBLIC" | "INVESTOR" | "RESTRICTED";
};

export function upsertOfferingDocument(db: Database, actorId: string, input: OfferingDocumentInput): string {
  assert(
    can(rolesFor(db, actorId), "offerings.draft") ||
      can(rolesFor(db, actorId), "projects.write") ||
      can(rolesFor(db, actorId), "*"),
    "FORBIDDEN",
  );
  requireUser(db, actorId);
  const offering = db.offerings.find((item) => item.id === input.offeringId);
  assert(offering, "NOT_FOUND");
  assert(input.documentType.trim(), "INVALID_STATE");
  assert(input.version.trim(), "INVALID_STATE");
  assert(input.titleFr.trim() && input.titleEn.trim(), "INVALID_STATE");
  assert(input.bodyFr.trim() && input.bodyEn.trim(), "INVALID_STATE");
  assert(
    input.visibility === "PUBLIC" || input.visibility === "INVESTOR" || input.visibility === "RESTRICTED",
    "INVALID_STATE",
  );
  const at = now(db);
  const checksum = digest(`${input.documentType}:${input.version}:${input.bodyFr}:${input.bodyEn}`);
  if (input.documentId) {
    const existing = db.offeringDocuments.find((item) => item.id === input.documentId);
    assert(existing && existing.offeringId === offering.id, "NOT_FOUND");
    existing.documentType = input.documentType.trim();
    existing.version = input.version.trim();
    existing.titleFr = input.titleFr.trim();
    existing.titleEn = input.titleEn.trim();
    existing.bodyFr = input.bodyFr.trim();
    existing.bodyEn = input.bodyEn.trim();
    existing.visibility = input.visibility;
    existing.checksum = checksum;
    if (input.visibility === "PUBLIC" && !existing.publishedAt) existing.publishedAt = at;
    if (input.visibility !== "PUBLIC") existing.publishedAt = null;
    audit(db, actorId, "offering_document.update", "offering_document", existing.id);
    return existing.id;
  }
  const id = uid();
  db.offeringDocuments.push({
    id,
    offeringId: offering.id,
    documentType: input.documentType.trim(),
    version: input.version.trim(),
    titleFr: input.titleFr.trim(),
    titleEn: input.titleEn.trim(),
    bodyFr: input.bodyFr.trim(),
    bodyEn: input.bodyEn.trim(),
    checksum,
    visibility: input.visibility,
    publishedAt: input.visibility === "PUBLIC" ? at : null,
    createdAt: at,
  });
  audit(db, actorId, "offering_document.create", "offering_document", id);
  return id;
}

export function submitIssuerUpdate(
  db: Database,
  actorId: string,
  input: { projectId: string; titleFr: string; titleEn: string; bodyFr: string; bodyEn: string },
): string {
  const roles = rolesFor(db, actorId);
  assert(can(roles, "issuer.self"), "FORBIDDEN");
  const project = db.projects.find((item) => item.id === input.projectId);
  assert(project, "NOT_FOUND");
  const rep = db.issuerRepresentatives.find(
    (item) => item.userId === actorId && item.issuerId === project.issuerId,
  );
  assert(rep, "FORBIDDEN");
  const id = uid();
  db.projectUpdates.push({
    id,
    projectId: project.id,
    titleFr: input.titleFr,
    titleEn: input.titleEn,
    bodyFr: input.bodyFr,
    bodyEn: input.bodyEn,
    visibility: "INVESTORS",
    approvalStatus: "SUBMITTED",
    submittedBy: actorId,
    approvedBy: null,
    publishedAt: null,
    createdAt: now(db),
  });
  audit(db, actorId, "update.submit", "project_update", id);
  return id;
}

export function publishUpdate(db: Database, actorId: string, updateId: string): void {
  requirePermission(db, actorId, "updates.publish");
  const item = db.projectUpdates.find((row) => row.id === updateId);
  assert(item && item.approvalStatus === "SUBMITTED", "INVALID_STATE");
  assert(item.submittedBy !== actorId, "MAKER_CHECKER");
  item.approvalStatus = "APPROVED";
  item.approvedBy = actorId;
  item.publishedAt = now(db);
  item.visibility = "PUBLIC";
  audit(db, actorId, "update.publish", "project_update", item.id);
}

export function castVote(
  db: Database,
  userId: string,
  resolutionId: string,
  choice: "FOR" | "AGAINST" | "ABSTAIN",
): void {
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  assert(profile, "NOT_FOUND");
  const resolution = db.resolutions.find((item) => item.id === resolutionId);
  assert(resolution && resolution.status === "OPEN", "INVALID_STATE");
  assert(now(db) >= resolution.opensAt && now(db) <= resolution.closesAt, "INVALID_STATE");
  const eligibility = db.resolutionEligibility.find(
    (item) => item.resolutionId === resolutionId && item.investorProfileId === profile.id,
  );
  assert(eligibility && eligibility.eligibleVotes > 0, "FORBIDDEN");
  assert(!db.votes.some((item) => item.resolutionId === resolutionId && item.investorProfileId === profile.id), "INVALID_STATE");
  db.votes.push({
    id: uid(),
    resolutionId,
    investorProfileId: profile.id,
    voteChoice: choice,
    votesCast: eligibility.eligibleVotes,
    submittedAt: now(db),
  });
  audit(db, userId, "vote.cast", "resolution", resolutionId, choice);
}

export function createTicket(
  db: Database,
  userId: string | null,
  category: string,
  subject: string,
  message: string,
): string {
  if (userId) requireUser(db, userId);
  const at = now(db);
  const id = uid();
  db.supportTickets.push({
    id,
    userId,
    category,
    subject,
    status: "OPEN",
    assignedTo: null,
    createdAt: at,
    updatedAt: at,
  });
  db.supportMessages.push({
    id: uid(),
    ticketId: id,
    senderId: userId,
    message,
    internal: false,
    createdAt: at,
  });
  if (userId) audit(db, userId, "support.create", "support_ticket", id);
  return id;
}

export function replyTicket(
  db: Database,
  actorId: string,
  ticketId: string,
  message: string,
  internal: boolean,
): void {
  const ticket = db.supportTickets.find((item) => item.id === ticketId);
  assert(ticket, "NOT_FOUND");
  const roles = rolesFor(db, actorId);
  const owns = ticket.userId === actorId;
  assert(owns || can(roles, "support.manage") || can(roles, "*"), "FORBIDDEN");
  if (internal) assert(can(roles, "support.manage") || can(roles, "*"), "FORBIDDEN");
  db.supportMessages.push({
    id: uid(),
    ticketId,
    senderId: actorId,
    message,
    internal,
    createdAt: now(db),
  });
  ticket.status = owns ? "PENDING" : "OPEN";
  ticket.updatedAt = now(db);
  if (!owns && ticket.userId && !internal) {
    notify(db, ticket.userId, "support.reply", "Réponse du support", "Support reply", message, message);
  }
}

export function proposeDividend(
  db: Database,
  actorId: string,
  input: { issuerId: string; shareClassId: string; perShareMinor: number; recordDate: string; paymentDate: string; withholdingBps: number },
): string {
  const representsIssuer = db.issuerRepresentatives.some(
    (item) => item.userId === actorId && item.issuerId === input.issuerId && item.authorityStatus === "ACTIVE",
  );
  const roles = rolesFor(db, actorId);
  assert(
    can(roles, "dividends.prepare") || can(roles, "*") || (can(roles, "dividends.declare") && representsIssuer),
    "FORBIDDEN",
  );
  assert(Number.isInteger(input.perShareMinor) && input.perShareMinor > 0, "AMOUNT_INVALID");
  const id = uid();
  db.dividendDeclarations.push({
    id,
    issuerId: input.issuerId,
    shareClassId: input.shareClassId,
    currencyCode: "USD",
    perShareMinor: input.perShareMinor,
    recordDate: input.recordDate,
    paymentDate: input.paymentDate,
    status: "PROPOSED",
    withholdingBps: input.withholdingBps,
    preparedBy: actorId,
    approvedBy: null,
    createdAt: now(db),
  });
  const investors = new Set(
    db.shareholdingEvents.filter((event) => event.issuerId === input.issuerId && event.shareClassId === input.shareClassId).map((event) => event.investorProfileId),
  );
  for (const investorProfileId of investors) {
    const shares = holdingQuantity(db, investorProfileId, input.issuerId, input.shareClassId, input.recordDate);
    if (shares <= 0) continue;
    const amounts = dividendAmounts(shares, input.perShareMinor, input.withholdingBps);
    db.dividendEntitlements.push({
      id: uid(),
      declarationId: id,
      investorProfileId,
      eligibleShareQuantity: shares,
      grossAmountMinor: amounts.gross,
      withholdingTaxMinor: amounts.withholding,
      netAmountMinor: amounts.net,
      calculationVersion: "v1-floor-bps",
      createdAt: now(db),
    });
  }
  audit(db, actorId, "dividend.propose", "dividend", id);
  return id;
}

export function approveDividend(db: Database, actorId: string, declarationId: string, password: string): void {
  requirePermission(db, actorId, "*");
  stepUp(db, actorId, password);
  const declaration = db.dividendDeclarations.find((item) => item.id === declarationId);
  assert(declaration && declaration.status === "PROPOSED", "INVALID_STATE");
  assert(declaration.preparedBy !== actorId, "MAKER_CHECKER");
  declaration.status = "APPROVED";
  declaration.approvedBy = actorId;
  for (const entitlement of db.dividendEntitlements.filter((item) => item.declarationId === declaration.id)) {
    db.dividendPayments.push({
      id: uid(),
      entitlementId: entitlement.id,
      provider: "sandbox",
      providerReference: `DIV-${entitlement.id.slice(0, 8)}`,
      amountMinor: entitlement.netAmountMinor,
      currencyCode: declaration.currencyCode,
      status: "PENDING",
      paidAt: null,
      createdAt: now(db),
    });
    const profile = db.investorProfiles.find((item) => item.id === entitlement.investorProfileId);
    if (profile) {
      notify(
        db,
        profile.userId,
        "dividend.declared",
        "Dividende de démonstration déclaré",
        "Demo dividend declared",
        "Un dividende a été déclaré. Le paiement reste en attente.",
        "A dividend was declared. Payment is still pending.",
      );
    }
  }
  audit(db, actorId, "dividend.approve", "dividend", declaration.id);
}

export function markDividendPaid(db: Database, actorId: string, paymentId: string): void {
  requirePermission(db, actorId, "dividends.prepare");
  const payment = db.dividendPayments.find((item) => item.id === paymentId);
  assert(payment && payment.status === "PENDING", "INVALID_STATE");
  const entitlement = db.dividendEntitlements.find((item) => item.id === payment.entitlementId);
  const declaration = entitlement && db.dividendDeclarations.find((item) => item.id === entitlement.declarationId);
  assert(declaration && (declaration.status === "APPROVED" || declaration.status === "PAID"), "INVALID_STATE");
  payment.status = "PAID";
  payment.paidAt = now(db);
  if (declaration && db.dividendPayments.filter((item) => db.dividendEntitlements.some((row) => row.id === item.entitlementId && row.declarationId === declaration.id)).every((item) => item.status === "PAID")) {
    declaration.status = "PAID";
  }
  audit(db, actorId, "dividend.pay", "dividend_payment", payment.id);
}

export function markNotificationRead(db: Database, userId: string, notificationId: string): void {
  const item = db.notifications.find((row) => row.id === notificationId && row.userId === userId);
  assert(item, "NOT_FOUND");
  item.status = "READ";
}
