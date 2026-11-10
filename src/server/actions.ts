"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStore, asAppError } from "./db/store";
import { peekDemoCode, stashDemoCode } from "./auth/demo-codes";
import { clearSession, getSession, readMfaPending, setMfaPending, setSession } from "./auth/session";
import { AppError } from "./domain/errors";
import {
  addInheritanceApproval,
  advanceInheritance,
  applySandboxPayment,
  approveAllotment,
  approveDividend,
  approveRefund,
  authenticate,
  cancelSubscription,
  castVote,
  createDraftProject,
  createSubscription,
  createTicket,
  linkOrCreateClerk,
  linkOrCreateGoogle,
  markDividendPaid,
  markNotificationRead,
  prepareAllotment,
  proposeDividend,
  publishUpdate,
  recordInheritanceRegisterUpdate,
  registerUser,
  removeNextOfKin,
  replyTicket,
  reportDeath,
  requestRefund,
  resendEmailCode,
  reviewKyc,
  saveNextOfKin,
  saveNomination,
  settlePayment,
  submitIdentityDocument,
  submitIssuerUpdate,
  transitionOffering,
  updateInvestorDetails,
  verifyEmail,
  verifyStaffMfa,
} from "./domain/mutate";
import { quoteSubscription } from "./domain/finance";
import { uid } from "./domain/crypto";
import type { InheritanceStatus, KycStatus, Locale, OfferingStatus } from "./domain/types";
import { parseMajorToMinor } from "@/lib/format";
import { appConfig } from "@/lib/config";
import { isGender } from "@/lib/choices";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

function fail(error: unknown): ActionState {
  const known = asAppError(error);
  if (known) return { error: known.code };
  console.error("action_failed");
  return { error: "INVALID_STATE" };
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const result = getStore().update((db) =>
      registerUser(db, {
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        password: String(formData.get("password") ?? ""),
        country: String(formData.get("country") ?? ""),
        language: (String(formData.get("language") ?? "fr") === "en" ? "en" : "fr") as Locale,
        acceptTerms: formData.get("terms") === "on",
        gender: String(formData.get("gender") ?? ""),
        dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      }),
    );
    if (appConfig.demoMode) stashDemoCode(result.userId, result.code);
    redirect(`/verify?email=${encodeURIComponent(String(formData.get("email") ?? ""))}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function verifyEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  try {
    const userId = getStore().update((db) => verifyEmail(db, email, String(formData.get("code") ?? "")));
    await setSession(userId);
    redirect("/investor/onboarding");
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function resendCodeAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const result = getStore().update((db) => resendEmailCode(db, email));
  if (result && appConfig.demoMode) stashDemoCode(result.userId, result.code);
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function bindClerkSession(): Promise<void> {
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress;
  if (!email) redirect("/sign-in");
  const userId = getStore().update((db) =>
    linkOrCreateClerk(db, {
      clerkUserId,
      email,
      firstName: clerkUser?.firstName ?? "",
      lastName: clerkUser?.lastName ?? "",
    }),
  );
  await setSession(userId);
  redirect(destinationFor(userId));
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const result = getStore().update((db) =>
      authenticate(db, String(formData.get("email") ?? ""), String(formData.get("password") ?? "")),
    );
    if (result.needsMfa) {
      await setMfaPending(result.userId);
      redirect("/mfa");
    }
    await setSession(result.userId);
    redirect(destinationFor(result.userId));
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function mfaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await readMfaPending();
  if (!userId) return { error: "MFA_REQUIRED" };
  try {
    getStore().update((db) => verifyStaffMfa(db, userId, String(formData.get("code") ?? "")));
    await setSession(userId);
    redirect(destinationFor(userId));
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function signOutAction() {
  await clearSession();
  redirect("/");
}

export async function googleDemoAction() {
  if (!appConfig.demoMode) throw new AppError("FORBIDDEN");
  const session = await getSession();
  const result = getStore().update((db) =>
    linkOrCreateGoogle(db, session?.user.id ?? null, {
      email: session?.user.email ?? "google.demo@demo.jeunese.test",
      subject: session ? `google-linked-${session.user.id}` : "google-sandbox-subject",
      emailVerified: true,
    }),
  );
  await setSession(result.userId);
  redirect(result.created ? "/investor/onboarding" : "/investor");
}

export async function profileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "FORBIDDEN" };
  try {
    getStore().update((db) =>
      updateInvestorDetails(db, session.user.id, {
        firstName: String(formData.get("firstName") ?? ""),
        middleName: String(formData.get("middleName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        country: String(formData.get("country") ?? ""),
        language: formData.get("language") === "en" ? "en" : "fr",
        dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
        nationality: String(formData.get("nationality") ?? ""),
        addressLine: String(formData.get("addressLine") ?? ""),
        city: String(formData.get("city") ?? ""),
        taxResidency: String(formData.get("taxResidency") ?? ""),
        taxId: String(formData.get("taxId") ?? ""),
        sourceOfFunds: String(formData.get("sourceOfFunds") ?? ""),
        pepStatus: formData.get("pep") === "YES" ? "YES" : "NO",
        payoutLabel: String(formData.get("payoutLabel") ?? ""),
        gender: String(formData.get("gender") ?? ""),
      }),
    );
    revalidatePath("/investor");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function kycAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "FORBIDDEN" };
  try {
    const gender = String(formData.get("gender") ?? "");
    getStore().update((db) => {
      if (isGender(gender)) {
        const user = db.users.find((item) => item.id === session.user.id);
        const profile = db.investorProfiles.find((item) => item.userId === session.user.id);
        if (user) user.gender = gender;
        if (profile) profile.gender = gender;
      }
      return submitIdentityDocument(db, session.user.id, {
        documentType: String(formData.get("documentType") ?? ""),
        issuingCountry: String(formData.get("issuingCountry") ?? ""),
        documentNumber: String(formData.get("documentNumber") ?? ""),
        expiryDate: String(formData.get("expiryDate") ?? ""),
      });
    });
    revalidatePath("/investor/onboarding");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function kinAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  getStore().update((db) =>
    saveNextOfKin(db, session.user.id, {
      id: String(formData.get("id") ?? "") || undefined,
      fullName: String(formData.get("fullName") ?? ""),
      relationship: String(formData.get("relationship") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      gender: String(formData.get("gender") ?? ""),
    }),
  );
  redirect("/investor/profile/contacts");
}

export async function deleteKinAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  getStore().update((db) => removeNextOfKin(db, session.user.id, String(formData.get("id") ?? "")));
  redirect("/investor/profile/contacts");
}

export async function nominationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "FORBIDDEN" };
  const people = [0, 1, 2]
    .map((index) => ({
      fullName: String(formData.get(`name${index}`) ?? ""),
      relationship: String(formData.get(`rel${index}`) ?? ""),
      email: String(formData.get(`email${index}`) ?? ""),
      phone: String(formData.get(`phone${index}`) ?? ""),
      bps: Number(formData.get(`bps${index}`) ?? 0),
      gender: String(formData.get(`gender${index}`) ?? ""),
    }))
    .filter((person) => person.fullName || person.bps);
  try {
    getStore().update((db) =>
      saveNomination(db, session.user.id, {
        activate: formData.get("activate") === "on",
        acknowledgement: formData.get("ack") === "on",
        people,
      }),
    );
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deathReportAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  if (!profile) redirect("/investor/profile");
  getStore().update((db) =>
    reportDeath(
      db,
      session.user.id,
      profile.id,
      String(formData.get("jurisdiction") ?? "CD"),
      String(formData.get("notes") ?? ""),
    ),
  );
  redirect("/investor/profile/beneficiaries");
}

export async function quoteAction(offeringId: string, amountMajor: string) {
  const db = getStore().db;
  const offering = db.offerings.find((item) => item.id === offeringId);
  const terms = db.offeringShareTerms.find((item) => item.offeringId === offeringId);
  const amountMinor = parseMajorToMinor(amountMajor);
  if (!offering || !terms || amountMinor === null) return { ok: false as const, error: "AMOUNT_INVALID" };
  const quote = quoteSubscription({
    amountMinor,
    issuePriceMinor: terms.issuePriceMinor,
    fractionalSharesAllowed: terms.fractionalSharesAllowed,
    minimumSubscriptionMinor: offering.minimumSubscriptionMinor,
    maximumSubscriptionMinor: offering.maximumSubscriptionMinor,
    minimumShares: terms.minimumSharesPerInvestor,
    maximumShares: terms.maximumSharesPerInvestor,
    feeMinor: offering.feeMinor,
  });
  return quote;
}

export async function subscribeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "FORBIDDEN" };
  const amountMinor = parseMajorToMinor(String(formData.get("amount") ?? ""));
  if (amountMinor === null) return { error: "AMOUNT_INVALID" };
  try {
    const id = getStore().update((db) =>
      createSubscription(db, session.user.id, {
        offeringId: String(formData.get("offeringId") ?? ""),
        amountMinor,
        documentIds: formData.getAll("documentId").map(String),
        riskAccepted: formData.get("risk") === "on",
      }),
    );
    redirect(`/investor/subscriptions/${id}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function cancelSubAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  getStore().update((db) => cancelSubscription(db, session.user.id, String(formData.get("id") ?? "")));
  redirect("/investor/subscriptions");
}

export async function sandboxPayAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const subscriptionId = String(formData.get("id") ?? "");
  const sub = getStore().db.subscriptions.find((item) => item.id === subscriptionId);
  if (!sub) redirect("/investor/subscriptions");
  getStore().update((db) =>
    applySandboxPayment(db, {
      providerEventId: `sandbox-${uid()}`,
      providerTransactionId: `txn-${uid()}`,
      subscriptionId,
      amountMinor: sub.totalMinor,
      currencyCode: sub.currencyCode,
    }),
  );
  redirect(`/investor/subscriptions/${subscriptionId}?paid=1`);
}

export async function voteAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const choice = String(formData.get("choice") ?? "ABSTAIN");
  getStore().update((db) =>
    castVote(
      db,
      session.user.id,
      String(formData.get("resolutionId") ?? ""),
      choice === "FOR" || choice === "AGAINST" ? choice : "ABSTAIN",
    ),
  );
  redirect("/investor/votes");
}

export async function ticketAction(formData: FormData) {
  const session = await getSession();
  const id = getStore().update((db) =>
    createTicket(
      db,
      session?.user.id ?? null,
      String(formData.get("category") ?? "general"),
      String(formData.get("subject") ?? ""),
      String(formData.get("message") ?? ""),
    ),
  );
  redirect(session ? `/investor/support/${id}` : "/contact?sent=1");
}

export async function replyAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const ticketId = String(formData.get("ticketId") ?? "");
  getStore().update((db) =>
    replyTicket(db, session.user.id, ticketId, String(formData.get("message") ?? ""), formData.get("internal") === "on"),
  );
  redirect(session.roles.includes("investor") ? `/investor/support/${ticketId}` : `/admin/support`);
}

export async function readNoteAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  getStore().update((db) => markNotificationRead(db, session.user.id, String(formData.get("id") ?? "")));
  redirect("/investor/notifications");
}

export async function kycDecisionAction(formData: FormData) {
  const session = await requireStaff();
  const decision = String(formData.get("decision") ?? "") as Extract<
    KycStatus,
    "APPROVED" | "REJECTED" | "ADDITIONAL_INFORMATION_REQUIRED" | "SUSPENDED"
  >;
  getStore().update((db) =>
    reviewKyc(
      db,
      session.user.id,
      String(formData.get("caseId") ?? ""),
      decision,
      String(formData.get("reason") ?? ""),
      String(formData.get("notes") ?? ""),
      String(formData.get("password") ?? ""),
    ),
  );
  redirect("/admin/kyc");
}

export async function offeringTransitionAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) =>
    transitionOffering(
      db,
      session.user.id,
      String(formData.get("offeringId") ?? ""),
      String(formData.get("to") ?? "") as OfferingStatus,
      String(formData.get("reason") ?? ""),
    ),
  );
  redirect(`/admin/offerings/${String(formData.get("offeringId") ?? "")}`);
}

export async function createProjectAction(formData: FormData) {
  const session = await requireStaff();
  const price = parseMajorToMinor(String(formData.get("price") ?? ""));
  const min = parseMajorToMinor(String(formData.get("min") ?? ""));
  const max = parseMajorToMinor(String(formData.get("max") ?? ""));
  if (price === null || min === null || max === null) redirect("/admin/projects/new?error=AMOUNT_INVALID");
  try {
    const created = getStore().update((db) =>
      createDraftProject(db, session.user.id, {
        issuerId: String(formData.get("issuerId") ?? ""),
        titleFr: String(formData.get("titleFr") ?? ""),
        titleEn: String(formData.get("titleEn") ?? ""),
        location: String(formData.get("location") ?? ""),
        industry: String(formData.get("industry") ?? ""),
        minimumRaiseMinor: min,
        maximumRaiseMinor: max,
        issuePriceMinor: price,
        sharesOffered: Number(formData.get("shares") ?? 0),
        financingPurpose: String(formData.get("purpose") ?? "") === "START" ? "START" : "FINANCE",
      }),
    );
    redirect(`/admin/projects/${created.projectId}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/projects/new?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
}

export async function prepareAllotmentAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) =>
    prepareAllotment(
      db,
      session.user.id,
      String(formData.get("offeringId") ?? ""),
      formData.getAll("subscriptionId").map(String),
    ),
  );
  redirect("/admin/share-register");
}

export async function approveAllotmentAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) =>
    approveAllotment(
      db,
      session.user.id,
      String(formData.get("batchId") ?? ""),
      String(formData.get("evidence") ?? ""),
      String(formData.get("password") ?? ""),
    ),
  );
  redirect("/admin/share-register");
}

export async function settleAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) => settlePayment(db, session.user.id, String(formData.get("paymentId") ?? "")));
  redirect("/admin/payments");
}

export async function refundRequestAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) =>
    requestRefund(db, session.user.id, String(formData.get("paymentId") ?? ""), String(formData.get("reason") ?? "")),
  );
  redirect("/admin/payments");
}

export async function refundApproveAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) =>
    approveRefund(db, session.user.id, String(formData.get("refundId") ?? ""), String(formData.get("password") ?? "")),
  );
  redirect("/admin/payments");
}

export async function publishUpdateAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) => publishUpdate(db, session.user.id, String(formData.get("updateId") ?? "")));
  redirect("/admin/content");
}

export async function issuerUpdateAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  getStore().update((db) =>
    submitIssuerUpdate(db, session.user.id, {
      projectId: String(formData.get("projectId") ?? ""),
      titleFr: String(formData.get("titleFr") ?? ""),
      titleEn: String(formData.get("titleEn") ?? ""),
      bodyFr: String(formData.get("bodyFr") ?? ""),
      bodyEn: String(formData.get("bodyEn") ?? ""),
    }),
  );
  redirect("/issuer/updates");
}

export async function issuerProfitAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perShare = parseMajorToMinor(String(formData.get("perShare") ?? ""));
  if (perShare === null) redirect("/issuer/profits?error=AMOUNT_INVALID");
  const recordDate = String(formData.get("recordDate") ?? "");
  const paymentDate = String(formData.get("paymentDate") ?? "");
  try {
    getStore().update((db) =>
      proposeDividend(db, session.user.id, {
        issuerId: String(formData.get("issuerId") ?? ""),
        shareClassId: String(formData.get("shareClassId") ?? ""),
        perShareMinor: perShare,
        recordDate: `${recordDate}T23:59:59.000Z`,
        paymentDate: `${paymentDate}T23:59:59.000Z`,
        withholdingBps: Number(formData.get("withholdingBps") ?? 0),
      }),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const code = asAppError(error)?.code ?? "INVALID_STATE";
    redirect(`/issuer/profits?error=${code}`);
  }
  redirect("/issuer/profits");
}

export async function dividendProposeAction(formData: FormData) {
  const session = await requireStaff();
  const perShare = parseMajorToMinor(String(formData.get("perShare") ?? ""));
  if (perShare === null) redirect("/admin/dividends?error=AMOUNT_INVALID");
  getStore().update((db) =>
    proposeDividend(db, session.user.id, {
      issuerId: String(formData.get("issuerId") ?? ""),
      shareClassId: String(formData.get("shareClassId") ?? ""),
      perShareMinor: perShare,
      recordDate: new Date(String(formData.get("recordDate") ?? "")).toISOString(),
      paymentDate: new Date(String(formData.get("paymentDate") ?? "")).toISOString(),
      withholdingBps: Number(formData.get("withholdingBps") ?? 0),
    }),
  );
  redirect("/admin/dividends");
}

export async function dividendApproveAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) =>
    approveDividend(db, session.user.id, String(formData.get("declarationId") ?? ""), String(formData.get("password") ?? "")),
  );
  redirect("/admin/dividends");
}

export async function dividendPayAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) => markDividendPaid(db, session.user.id, String(formData.get("paymentId") ?? "")));
  redirect("/admin/dividends");
}

export async function inheritanceAdvanceAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) =>
    advanceInheritance(
      db,
      session.user.id,
      String(formData.get("caseId") ?? ""),
      String(formData.get("to") ?? "") as InheritanceStatus,
      String(formData.get("notes") ?? ""),
      String(formData.get("password") ?? ""),
    ),
  );
  redirect("/admin/inheritance");
}

export async function inheritanceApproveAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) =>
    addInheritanceApproval(
      db,
      session.user.id,
      String(formData.get("caseId") ?? ""),
      String(formData.get("evidence") ?? ""),
      String(formData.get("password") ?? ""),
    ),
  );
  redirect("/admin/inheritance");
}

export async function inheritanceTransferAction(formData: FormData) {
  const session = await requireStaff();
  getStore().update((db) =>
    recordInheritanceRegisterUpdate(
      db,
      session.user.id,
      String(formData.get("caseId") ?? ""),
      String(formData.get("fromId") ?? ""),
      String(formData.get("toId") ?? ""),
      String(formData.get("shareClassId") ?? ""),
      Number(formData.get("quantity") ?? 0),
      String(formData.get("password") ?? ""),
    ),
  );
  redirect("/admin/inheritance");
}

export async function resetDemoAction() {
  const session = await requireStaff();
  if (!session.roles.includes("platform_admin")) throw new AppError("FORBIDDEN");
  getStore().reset();
  redirect("/admin/settings");
}

export async function currentDemoCode(email: string): Promise<string | null> {
  if (!appConfig.demoMode) return null;
  const user = getStore().db.users.find((item) => item.email === email.trim().toLowerCase());
  if (!user) return null;
  return peekDemoCode(user.id) ?? null;
}

async function requireStaff() {
  const session = await getSession();
  if (!session || session.roles.every((role) => role === "investor")) redirect("/sign-in");
  return session;
}

function destinationFor(userId: string): string {
  const roles = getStore().db.userRoles.filter((item) => item.userId === userId).map((item) => item.role);
  if (roles.includes("platform_admin") || roles.includes("kyc_officer") || roles.includes("finance_officer") || roles.includes("project_analyst") || roles.includes("offering_approver") || roles.includes("support_agent") || roles.includes("auditor")) {
    return "/admin";
  }
  if (roles.includes("issuer_manager")) return "/issuer";
  return "/investor";
}

function isRedirect(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT"));
}
