"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStore, asAppError } from "./db/store";
import { describeDbError } from "./db/errors";
import { peekDemoCode, stashDemoCode } from "./auth/demo-codes";
import { clearSession, getSession, readMfaPending, setMfaPending, setSession } from "./auth/session";
import { AppError } from "./domain/errors";
import { withError, withNotice } from "./domain/notices";
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
  createIssuer,
  createStaffMember,
  createSubscription,
  createTicket,
  completeInvestorOnboarding,
  isInvestorOnboardingComplete,
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
  rotateStaffConfirmationCode,
  saveNextOfKin,
  saveNomination,
  settlePayment,
  submitIdentityDocument,
  submitIssuerUpdate,
  transitionOffering,
  updateInvestorDetails,
  updateOfferingTerms,
  updateProjectContent,
  upsertOfferingDocument,
  verifyEmail,
  verifyStaffMfa,
} from "./domain/mutate";
import { quoteSubscription } from "./domain/finance";
import { uid } from "./domain/crypto";
import type { InheritanceStatus, KycStatus, Locale, OfferingStatus, Role } from "./domain/types";
import { fromDatetimeLocalValue, parseMajorToMinor } from "@/lib/format";
import { appConfig } from "@/lib/config";
import { isGender } from "@/lib/choices";

export type ClerkBindProfile = {
  phone?: string;
  country?: string;
  gender?: string;
  dateOfBirth?: string;
  language?: Locale;
  firstName?: string;
  lastName?: string;
};

export interface ActionState {
  error?: string;
  ok?: boolean;
}

function fail(error: unknown): ActionState {
  const known = asAppError(error);
  if (known) return { error: known.code };
  console.error("action_failed", describeDbError(error));
  return { error: "INVALID_STATE" };
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const result = await (await getStore()).update((db) =>
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
    redirect(withNotice(`/verify?email=${encodeURIComponent(String(formData.get("email") ?? ""))}`, "ACCOUNT_CREATED"));
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function verifyEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  try {
    const userId = await (await getStore()).update((db) => verifyEmail(db, email, String(formData.get("code") ?? "")));
    await setSession(userId);
    redirect(withNotice("/investor/onboarding", "EMAIL_VERIFIED"));
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function resendCodeAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const result = await (await getStore()).update((db) => resendEmailCode(db, email));
  if (result && appConfig.demoMode) stashDemoCode(result.userId, result.code);
  redirect(withNotice(`/verify?email=${encodeURIComponent(email)}`, "CODE_RESENT"));
}

function clerkMetadataProfile(clerkUser: {
  unsafeMetadata?: Record<string, unknown> | null;
} | null): ClerkBindProfile | undefined {
  const meta = clerkUser?.unsafeMetadata;
  if (!meta || typeof meta !== "object") return undefined;
  const phone = typeof meta.phone === "string" ? meta.phone : undefined;
  const country = typeof meta.country === "string" ? meta.country : undefined;
  const gender = typeof meta.gender === "string" ? meta.gender : undefined;
  const dateOfBirth = typeof meta.dateOfBirth === "string" ? meta.dateOfBirth : undefined;
  const language = meta.language === "en" || meta.language === "fr" ? meta.language : undefined;
  if (!phone && !country && !gender && !dateOfBirth && !language) return undefined;
  return { phone, country, gender, dateOfBirth, language };
}

export type ClerkBindResult = { error: string };

/**
 * Bridges an active Clerk session into the Jeunese `jeunese_session` cookie, then redirects.
 * Failures return an error code instead of redirecting so /sign-in ↔ /sign-in/clerk cannot loop.
 */
export async function bindClerkSession(profile?: ClerkBindProfile): Promise<ClerkBindResult> {
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");
  try {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress;
    if (!email) throw new AppError("INVALID_EMAIL");

    const seed = profile ?? clerkMetadataProfile(clerkUser);
    const linked = await (await getStore()).update((db) =>
      linkOrCreateClerk(db, {
        clerkUserId,
        email,
        firstName: seed?.firstName?.trim() || clerkUser?.firstName || "",
        lastName: seed?.lastName?.trim() || clerkUser?.lastName || "",
        profile: seed
          ? {
              phone: seed.phone,
              country: seed.country,
              gender: seed.gender,
              dateOfBirth: seed.dateOfBirth,
              language: seed.language,
            }
          : undefined,
      }),
    );
    await setSession(linked.userId);
    redirect(await destinationFor(linked.userId, linked.created));
  } catch (error) {
    if (isRedirect(error)) throw error;
    console.error("bind_clerk_session_failed", describeDbError(error));
    return { error: asAppError(error)?.code ?? "SESSION_BIND_FAILED" };
  }
}

/** Server-side entry: if Clerk is already signed in, finish the Jeunese bind. */
export async function continueIfClerkSignedIn(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) return;
  const existing = await getSession();
  if (existing) redirect(await destinationFor(existing.user.id));
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (userId) redirect("/sign-in/clerk");
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const result = await (await getStore()).update((db) =>
      authenticate(db, String(formData.get("email") ?? ""), String(formData.get("password") ?? "")),
    );
    if (result.needsMfa) {
      await setMfaPending(result.userId);
      redirect("/mfa");
    }
    await setSession(result.userId);
    redirect(await destinationFor(result.userId));
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function mfaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await readMfaPending();
  if (!userId) return { error: "MFA_REQUIRED" };
  try {
    await (await getStore()).update((db) => verifyStaffMfa(db, userId, String(formData.get("code") ?? "")));
    await setSession(userId);
    redirect(await destinationFor(userId));
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

/**
 * Clears the Jeunese cookies. Navigation is left to the caller so the browser-side Clerk sign-out
 * (which clears Clerk's own cookies) can run afterwards. `revokeClerk` is the fallback for when
 * that browser-side sign-out failed.
 */
export async function signOutAction(options?: { revokeClerk?: boolean }): Promise<{ ok: true }> {
  await clearSession();
  if (options?.revokeClerk && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    try {
      const { auth, clerkClient } = await import("@clerk/nextjs/server");
      const session = await auth();
      if (session.sessionId) {
        const client = await clerkClient();
        await client.sessions.revokeSession(session.sessionId);
      }
    } catch (error) {
      console.error("clerk_revoke_failed", describeDbError(error));
    }
  }
  return { ok: true };
}

export async function googleDemoAction() {
  if (!appConfig.demoMode) throw new AppError("FORBIDDEN");
  const session = await getSession();
  const result = await (await getStore()).update((db) =>
    linkOrCreateGoogle(db, session?.user.id ?? null, {
      email: session?.user.email ?? "google.demo@demo.jeunese.test",
      subject: session ? `google-linked-${session.user.id}` : "google-sandbox-subject",
      emailVerified: true,
    }),
  );
  await setSession(result.userId);
  redirect(result.created ? "/investor/onboarding" : "/investor");
}

function profileFieldsFromForm(formData: FormData) {
  return {
    firstName: String(formData.get("firstName") ?? ""),
    middleName: String(formData.get("middleName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    country: String(formData.get("country") ?? ""),
    language: (formData.get("language") === "en" ? "en" : "fr") as Locale,
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    nationality: String(formData.get("nationality") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    city: String(formData.get("city") ?? ""),
    taxResidency: String(formData.get("taxResidency") ?? ""),
    taxId: String(formData.get("taxId") ?? ""),
    sourceOfFunds: String(formData.get("sourceOfFunds") ?? ""),
    pepStatus: (formData.get("pep") === "YES" ? "YES" : "NO") as "YES" | "NO",
    payoutLabel: String(formData.get("payoutLabel") ?? ""),
    gender: String(formData.get("gender") ?? ""),
  };
}

export async function profileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "FORBIDDEN" };
  try {
    await (await getStore()).update((db) => updateInvestorDetails(db, session.user.id, profileFieldsFromForm(formData)));
    revalidatePath("/investor");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function onboardingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "FORBIDDEN" };
  try {
    await (await getStore()).update((db) => completeInvestorOnboarding(db, session.user.id, profileFieldsFromForm(formData)));
    revalidatePath("/investor/onboarding");
    revalidatePath("/investor");
    redirect(withNotice("/investor", "ONBOARDING_DONE"));
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function kycAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "FORBIDDEN" };
  try {
    const gender = String(formData.get("gender") ?? "");
    await (await getStore()).update((db) => {
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
  const id = String(formData.get("id") ?? "").trim();
  const back = id
    ? `/investor/profile/contacts?edit=${encodeURIComponent(id)}`
    : "/investor/profile/contacts?modal=new";
  await attempt(back, async () => (await getStore()).update((db) =>
    saveNextOfKin(db, session.user.id, {
      id: id || undefined,
      fullName: String(formData.get("fullName") ?? ""),
      relationship: String(formData.get("relationship") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      gender: String(formData.get("gender") ?? ""),
    }),
  ));
  redirect(withNotice("/investor/profile/contacts", "KIN_SAVED"));
}

export async function deleteKinAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  await attempt("/investor/profile/contacts", async () =>
    (await getStore()).update((db) => removeNextOfKin(db, session.user.id, String(formData.get("id") ?? ""))),
  );
  redirect(withNotice("/investor/profile/contacts", "KIN_REMOVED"));
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
    await (await getStore()).update((db) =>
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
  await attempt("/investor/profile/beneficiaries", async () => (await getStore()).update((db) =>
    reportDeath(
      db,
      session.user.id,
      profile.id,
      String(formData.get("jurisdiction") ?? "CD"),
      String(formData.get("notes") ?? ""),
    ),
  ));
  redirect(withNotice("/investor/profile/beneficiaries", "DEATH_REPORTED"));
}

export async function quoteAction(offeringId: string, amountMajor: string) {
  const db = (await getStore()).db;
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
    const id = await (await getStore()).update((db) =>
      createSubscription(db, session.user.id, {
        offeringId: String(formData.get("offeringId") ?? ""),
        amountMinor,
        documentIds: formData.getAll("documentId").map(String),
        riskAccepted: formData.get("risk") === "on",
      }),
    );
    redirect(withNotice(`/investor/subscriptions/${id}`, "SUBSCRIPTION_CREATED"));
  } catch (error) {
    if (isRedirect(error)) throw error;
    return fail(error);
  }
}

export async function cancelSubAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  await attempt("/investor/subscriptions", async () =>
    (await getStore()).update((db) => cancelSubscription(db, session.user.id, String(formData.get("id") ?? ""))),
  );
  redirect(withNotice("/investor/subscriptions", "SUBSCRIPTION_CANCELLED"));
}

export async function sandboxPayAction(formData: FormData) {
  if (!appConfig.sandboxPaymentsEnabled) throw new AppError("FORBIDDEN");
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const subscriptionId = String(formData.get("id") ?? "");
  const sub = (await getStore()).db.subscriptions.find((item) => item.id === subscriptionId);
  if (!sub) redirect("/investor/subscriptions");
  await attempt(`/investor/subscriptions/${subscriptionId}`, async () => (await getStore()).update((db) =>
    applySandboxPayment(db, {
      providerEventId: `sandbox-${uid()}`,
      providerTransactionId: `txn-${uid()}`,
      subscriptionId,
      amountMinor: sub.totalMinor,
      currencyCode: sub.currencyCode,
    }),
  ));
  redirect(withNotice(`/investor/subscriptions/${subscriptionId}?paid=1`, "PAYMENT_RECORDED"));
}

export async function voteAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const choice = String(formData.get("choice") ?? "ABSTAIN");
  await attempt("/investor/votes", async () => (await getStore()).update((db) =>
    castVote(
      db,
      session.user.id,
      String(formData.get("resolutionId") ?? ""),
      choice === "FOR" || choice === "AGAINST" ? choice : "ABSTAIN",
    ),
  ));
  redirect(withNotice("/investor/votes", "VOTE_CAST"));
}

export async function ticketAction(formData: FormData) {
  const session = await getSession();
  const id = await attempt(session ? "/investor/support?modal=new" : "/contact", async () => (await getStore()).update((db) =>
    createTicket(
      db,
      session?.user.id ?? null,
      String(formData.get("category") ?? "general"),
      String(formData.get("subject") ?? ""),
      String(formData.get("message") ?? ""),
    ),
  ));
  redirect(withNotice(session ? `/investor/support/${id}` : "/contact?sent=1", "TICKET_SENT"));
}

export async function replyAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const ticketId = String(formData.get("ticketId") ?? "");
  const isInvestor = session.roles.includes("investor");
  const back = isInvestor
    ? `/investor/support/${ticketId}`
    : `/admin/support?reply=${encodeURIComponent(ticketId || "unknown")}`;
  const success = isInvestor ? `/investor/support/${ticketId}` : "/admin/support";
  await attempt(back, async () => (await getStore()).update((db) =>
    replyTicket(db, session.user.id, ticketId, String(formData.get("message") ?? ""), formData.get("internal") === "on"),
  ));
  redirect(withNotice(success, "REPLY_SENT"));
}

export async function readNoteAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  await attempt("/investor/notifications", async () =>
    (await getStore()).update((db) => markNotificationRead(db, session.user.id, String(formData.get("id") ?? ""))),
  );
  redirect(withNotice("/investor/notifications", "NOTIFICATION_READ"));
}

const KYC_DECISION_NOTICE: Record<string, string> = {
  APPROVED: "KYC_APPROVED",
  REJECTED: "KYC_REJECTED",
  ADDITIONAL_INFORMATION_REQUIRED: "KYC_INFO_REQUESTED",
  SUSPENDED: "KYC_SUSPENDED",
};

export async function kycDecisionAction(formData: FormData) {
  const session = await requireStaff();
  const decision = String(formData.get("decision") ?? "").trim() as Extract<
    KycStatus,
    "APPROVED" | "REJECTED" | "ADDITIONAL_INFORMATION_REQUIRED" | "SUSPENDED"
  >;
  const allowed = new Set(["APPROVED", "REJECTED", "ADDITIONAL_INFORMATION_REQUIRED", "SUSPENDED"]);
  const caseId = String(formData.get("caseId") ?? "").trim();
  if (!allowed.has(decision)) {
    redirect(caseId ? `/admin/kyc?review=${encodeURIComponent(caseId)}&error=STATUS_REQUIRED` : "/admin/kyc?error=STATUS_REQUIRED");
  }
  const requestedDocs = formData
    .getAll("requestedDocs")
    .map((item) => String(item).trim())
    .filter(Boolean);
  try {
    await (await getStore()).update((db) =>
      reviewKyc(
        db,
        session.user.id,
        caseId,
        decision,
        String(formData.get("reason") ?? ""),
        String(formData.get("notes") ?? ""),
        String(formData.get("password") ?? ""),
        requestedDocs,
      ),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(
      caseId
        ? `/admin/kyc?review=${encodeURIComponent(caseId)}&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`
        : `/admin/kyc?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`,
    );
  }
  redirect(withNotice("/admin/kyc", KYC_DECISION_NOTICE[decision]));
}

export async function offeringTransitionAction(formData: FormData) {
  const session = await requireStaff();
  const offeringId = String(formData.get("offeringId") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  const back = `/admin/offerings/${encodeURIComponent(offeringId || "unknown")}`;
  const modalBack = `${back}?modal=transition`;
  if (!offeringId) redirect("/admin/offerings?error=NOT_FOUND");
  if (!to) redirect(`${modalBack}&error=STATUS_REQUIRED`);
  try {
    await (await getStore()).update((db) =>
      transitionOffering(db, session.user.id, offeringId, to as OfferingStatus, String(formData.get("reason") ?? "")),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`${modalBack}&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  redirect(withNotice(back, "OFFERING_TRANSITIONED"));
}

export async function createIssuerAction(formData: FormData) {
  const session = await requireStaff();
  try {
    await (await getStore()).update((db) =>
      createIssuer(db, session.user.id, {
        legalName: String(formData.get("legalName") ?? ""),
        tradingName: String(formData.get("tradingName") ?? ""),
        registrationNumber: String(formData.get("registrationNumber") ?? ""),
        jurisdiction: String(formData.get("jurisdiction") ?? ""),
        legalForm: String(formData.get("legalForm") ?? ""),
        registeredAddress: String(formData.get("registeredAddress") ?? ""),
        industry: String(formData.get("industry") ?? ""),
        website: String(formData.get("website") ?? ""),
      }),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/issuers?modal=new&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  const next = String(formData.get("next") ?? "").trim();
  redirect(withNotice(next.startsWith("/admin/") ? next : "/admin/issuers", "ISSUER_CREATED"));
}

export async function createProjectAction(formData: FormData) {
  const session = await requireStaff();
  const price = parseMajorToMinor(String(formData.get("price") ?? ""));
  const min = parseMajorToMinor(String(formData.get("min") ?? ""));
  const max = parseMajorToMinor(String(formData.get("max") ?? ""));
  if (price === null || min === null || max === null) redirect("/admin/projects?modal=new&error=AMOUNT_INVALID");
  const issuerId = String(formData.get("issuerId") ?? "").trim();
  if (!issuerId) redirect("/admin/projects?modal=new&error=ISSUER_REQUIRED");
  try {
    await (await getStore()).update((db) =>
      createDraftProject(db, session.user.id, {
        issuerId,
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
    redirect(withNotice("/admin/projects", "PROJECT_CREATED"));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/projects?modal=new&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
}

function projectEditorPath(projectId: string, hash?: string): string {
  return `/admin/projects/${projectId}${hash ? `#${hash}` : ""}`;
}

function linesFromTextarea(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function requireMoney(formData: FormData, key: string): number | null {
  return parseMajorToMinor(String(formData.get(key) ?? ""));
}

export async function updateProjectContentAction(formData: FormData) {
  const session = await requireStaff();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const hash = String(formData.get("hash") ?? "overview").trim() || "overview";
  if (!projectId) redirect(withError("/admin/projects", "NOT_FOUND"));

  const proceedCount = Number(formData.get("proceedCount") ?? 0);
  const teamCount = Number(formData.get("teamCount") ?? 0);
  const useOfProceeds: { labelFr: string; labelEn: string; amountMinor: number }[] = [];
  for (let i = 0; i < proceedCount; i += 1) {
    const labelFr = String(formData.get(`proceedLabelFr_${i}`) ?? "").trim();
    const labelEn = String(formData.get(`proceedLabelEn_${i}`) ?? "").trim();
    const amountRaw = String(formData.get(`proceedAmount_${i}`) ?? "").trim();
    if (!labelFr && !labelEn && !amountRaw) continue;
    const amountMinor = parseMajorToMinor(amountRaw);
    if (amountMinor === null) {
      redirect(withError(projectEditorPath(projectId, hash), "AMOUNT_INVALID"));
    }
    if (!labelFr || !labelEn) {
      redirect(withError(projectEditorPath(projectId, hash), "INVALID_STATE"));
    }
    useOfProceeds.push({ labelFr, labelEn, amountMinor });
  }
  const team: {
    name: string;
    roleFr: string;
    roleEn: string;
    experienceFr: string;
    experienceEn: string;
  }[] = [];
  for (let i = 0; i < teamCount; i += 1) {
    const name = String(formData.get(`teamName_${i}`) ?? "").trim();
    const roleFr = String(formData.get(`teamRoleFr_${i}`) ?? "").trim();
    const roleEn = String(formData.get(`teamRoleEn_${i}`) ?? "").trim();
    const experienceFr = String(formData.get(`teamExperienceFr_${i}`) ?? "").trim();
    const experienceEn = String(formData.get(`teamExperienceEn_${i}`) ?? "").trim();
    if (!name && !roleFr && !roleEn && !experienceFr && !experienceEn) continue;
    if (!name || !roleFr || !roleEn) {
      redirect(withError(projectEditorPath(projectId, hash), "INVALID_STATE"));
    }
    team.push({ name, roleFr, roleEn, experienceFr, experienceEn });
  }

  const purpose = String(formData.get("financingPurpose") ?? "");
  const status = String(formData.get("status") ?? "");
  try {
    await (await getStore()).update((db) =>
      updateProjectContent(db, session.user.id, {
        projectId,
        titleFr: String(formData.get("titleFr") ?? ""),
        titleEn: String(formData.get("titleEn") ?? ""),
        shortFr: String(formData.get("shortFr") ?? ""),
        shortEn: String(formData.get("shortEn") ?? ""),
        fullFr: String(formData.get("fullFr") ?? ""),
        fullEn: String(formData.get("fullEn") ?? ""),
        marketFr: String(formData.get("marketFr") ?? ""),
        marketEn: String(formData.get("marketEn") ?? ""),
        industry: String(formData.get("industry") ?? ""),
        locationName: String(formData.get("locationName") ?? ""),
        financingPurpose: purpose === "START" ? "START" : "FINANCE",
        status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        useOfProceeds,
        team,
        risksFr: linesFromTextarea(String(formData.get("risksFr") ?? "")),
        risksEn: linesFromTextarea(String(formData.get("risksEn") ?? "")),
        assumptionsFr: String(formData.get("assumptionsFr") ?? ""),
        assumptionsEn: String(formData.get("assumptionsEn") ?? ""),
        projectionsFr: String(formData.get("projectionsFr") ?? ""),
        projectionsEn: String(formData.get("projectionsEn") ?? ""),
      }),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(withError(projectEditorPath(projectId, hash), known?.code ?? "INVALID_STATE"));
  }
  redirect(withNotice(projectEditorPath(projectId, hash), "PROJECT_CONTENT_SAVED"));
}

export async function updateOfferingTermsAction(formData: FormData) {
  const session = await requireStaff();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const offeringId = String(formData.get("offeringId") ?? "").trim();
  const path = projectEditorPath(projectId || "unknown", "offering");
  if (!projectId || !offeringId) redirect(withError("/admin/projects", "NOT_FOUND"));

  const minimumRaiseMinor = requireMoney(formData, "minimumRaise");
  const maximumRaiseMinor = requireMoney(formData, "maximumRaise");
  const minimumSubscriptionMinor = requireMoney(formData, "minimumSubscription");
  const maximumSubscriptionMinor = requireMoney(formData, "maximumSubscription");
  const issuePriceMinor = requireMoney(formData, "issuePrice");
  const feeMinor = requireMoney(formData, "fee");
  const preMoneyRaw = String(formData.get("preMoney") ?? "").trim();
  const preMoneyValuationMinor = preMoneyRaw === "" ? null : parseMajorToMinor(preMoneyRaw);
  const opensAt = fromDatetimeLocalValue(String(formData.get("opensAt") ?? ""));
  const closesAt = fromDatetimeLocalValue(String(formData.get("closesAt") ?? ""));
  if (
    minimumRaiseMinor === null ||
    maximumRaiseMinor === null ||
    minimumSubscriptionMinor === null ||
    maximumSubscriptionMinor === null ||
    issuePriceMinor === null ||
    feeMinor === null ||
    (preMoneyRaw !== "" && preMoneyValuationMinor === null) ||
    !opensAt ||
    !closesAt
  ) {
    redirect(withError(path, "AMOUNT_INVALID"));
  }

  try {
    await (await getStore()).update((db) =>
      updateOfferingTerms(db, session.user.id, {
        offeringId,
        nameFr: String(formData.get("nameFr") ?? ""),
        nameEn: String(formData.get("nameEn") ?? ""),
        minimumRaiseMinor,
        maximumRaiseMinor,
        minimumSubscriptionMinor,
        maximumSubscriptionMinor,
        opensAt,
        closesAt,
        feeMinor,
        preMoneyValuationMinor,
        permittedCountries: formData.getAll("permittedCountries").map(String).filter(Boolean),
        dividendPolicyFr: String(formData.get("dividendPolicyFr") ?? ""),
        dividendPolicyEn: String(formData.get("dividendPolicyEn") ?? ""),
        transferRestrictionsFr: String(formData.get("transferRestrictionsFr") ?? ""),
        transferRestrictionsEn: String(formData.get("transferRestrictionsEn") ?? ""),
        conditionsFr: String(formData.get("conditionsFr") ?? ""),
        conditionsEn: String(formData.get("conditionsEn") ?? ""),
        refundFr: String(formData.get("refundFr") ?? ""),
        refundEn: String(formData.get("refundEn") ?? ""),
        issuePriceMinor,
        sharesOffered: Number(formData.get("sharesOffered") ?? 0),
        minimumSharesPerInvestor: Number(formData.get("minimumShares") ?? 0),
        maximumSharesPerInvestor: Number(formData.get("maximumShares") ?? 0),
      }),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(withError(path, known?.code ?? "INVALID_STATE"));
  }
  redirect(withNotice(path, "OFFERING_TERMS_SAVED"));
}

export async function upsertOfferingDocumentAction(formData: FormData) {
  const session = await requireStaff();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const offeringId = String(formData.get("offeringId") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();
  const path = projectEditorPath(projectId || "unknown", "documents");
  if (!projectId || !offeringId) redirect(withError("/admin/projects", "NOT_FOUND"));
  const visibilityRaw = String(formData.get("visibility") ?? "PUBLIC");
  const visibility =
    visibilityRaw === "INVESTOR" || visibilityRaw === "RESTRICTED" ? visibilityRaw : "PUBLIC";
  try {
    await (await getStore()).update((db) =>
      upsertOfferingDocument(db, session.user.id, {
        documentId: documentId || undefined,
        offeringId,
        documentType: String(formData.get("documentType") ?? ""),
        version: String(formData.get("version") ?? ""),
        titleFr: String(formData.get("titleFr") ?? ""),
        titleEn: String(formData.get("titleEn") ?? ""),
        bodyFr: String(formData.get("bodyFr") ?? ""),
        bodyEn: String(formData.get("bodyEn") ?? ""),
        visibility,
      }),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(withError(path, known?.code ?? "INVALID_STATE"));
  }
  redirect(withNotice(path, "DOCUMENT_SAVED"));
}

export async function prepareAllotmentAction(formData: FormData) {
  const session = await requireStaff();
  try {
    await (await getStore()).update((db) =>
      prepareAllotment(
        db,
        session.user.id,
        String(formData.get("offeringId") ?? ""),
        formData.getAll("subscriptionId").map(String),
      ),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/share-register?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  redirect(withNotice("/admin/share-register", "ALLOTMENT_PREPARED"));
}

export async function approveAllotmentAction(formData: FormData) {
  const session = await requireStaff();
  try {
    await (await getStore()).update((db) =>
      approveAllotment(
        db,
        session.user.id,
        String(formData.get("batchId") ?? ""),
        String(formData.get("evidence") ?? ""),
        String(formData.get("password") ?? ""),
      ),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/share-register?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  redirect(withNotice("/admin/share-register", "ALLOTMENT_APPROVED"));
}

export async function settleAction(formData: FormData) {
  const session = await requireStaff();
  try {
    await (await getStore()).update((db) => settlePayment(db, session.user.id, String(formData.get("paymentId") ?? "")));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/payments?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  redirect(withNotice("/admin/payments", "PAYMENT_SETTLED"));
}

export async function refundRequestAction(formData: FormData) {
  const session = await requireStaff();
  const paymentId = String(formData.get("paymentId") ?? "").trim();
  try {
    await (await getStore()).update((db) =>
      requestRefund(db, session.user.id, paymentId, String(formData.get("reason") ?? "")),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(
      paymentId
        ? `/admin/payments?refund=${encodeURIComponent(paymentId)}&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`
        : `/admin/payments?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`,
    );
  }
  redirect(withNotice("/admin/payments", "REFUND_REQUESTED"));
}

export async function refundApproveAction(formData: FormData) {
  const session = await requireStaff();
  const refundId = String(formData.get("refundId") ?? "").trim();
  try {
    await (await getStore()).update((db) =>
      approveRefund(db, session.user.id, refundId, String(formData.get("password") ?? "")),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(
      refundId
        ? `/admin/payments?approve=${encodeURIComponent(refundId)}&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`
        : `/admin/payments?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`,
    );
  }
  redirect(withNotice("/admin/payments", "REFUND_APPROVED"));
}

export async function publishUpdateAction(formData: FormData) {
  const session = await requireStaff();
  await attempt("/admin/content", async () =>
    (await getStore()).update((db) => publishUpdate(db, session.user.id, String(formData.get("updateId") ?? ""))),
  );
  redirect(withNotice("/admin/content", "UPDATE_PUBLISHED"));
}

export async function issuerUpdateAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  await attempt("/issuer/updates?modal=new", async () => (await getStore()).update((db) =>
    submitIssuerUpdate(db, session.user.id, {
      projectId: String(formData.get("projectId") ?? ""),
      titleFr: String(formData.get("titleFr") ?? ""),
      titleEn: String(formData.get("titleEn") ?? ""),
      bodyFr: String(formData.get("bodyFr") ?? ""),
      bodyEn: String(formData.get("bodyEn") ?? ""),
    }),
  ));
  redirect(withNotice("/issuer/updates", "UPDATE_SUBMITTED"));
}

export async function issuerProfitAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perShare = parseMajorToMinor(String(formData.get("perShare") ?? ""));
  if (perShare === null) redirect("/issuer/profits?modal=propose&error=AMOUNT_INVALID");
  const recordDate = String(formData.get("recordDate") ?? "");
  const paymentDate = String(formData.get("paymentDate") ?? "");
  try {
    await (await getStore()).update((db) =>
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
    redirect(`/issuer/profits?modal=propose&error=${code}`);
  }
  redirect(withNotice("/issuer/profits", "PROFIT_PROPOSED"));
}

export async function dividendProposeAction(formData: FormData) {
  const session = await requireStaff();
  const perShare = parseMajorToMinor(String(formData.get("perShare") ?? ""));
  if (perShare === null) redirect("/admin/dividends?modal=propose&error=AMOUNT_INVALID");
  try {
    await (await getStore()).update((db) =>
      proposeDividend(db, session.user.id, {
        issuerId: String(formData.get("issuerId") ?? ""),
        shareClassId: String(formData.get("shareClassId") ?? ""),
        perShareMinor: perShare,
        recordDate: new Date(String(formData.get("recordDate") ?? "")).toISOString(),
        paymentDate: new Date(String(formData.get("paymentDate") ?? "")).toISOString(),
        withholdingBps: Number(formData.get("withholdingBps") ?? 0),
      }),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/dividends?modal=propose&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  redirect(withNotice("/admin/dividends", "DIVIDEND_PROPOSED"));
}

export async function dividendApproveAction(formData: FormData) {
  const session = await requireStaff();
  try {
    await (await getStore()).update((db) =>
      approveDividend(db, session.user.id, String(formData.get("declarationId") ?? ""), String(formData.get("password") ?? "")),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/dividends?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  redirect(withNotice("/admin/dividends", "DIVIDEND_APPROVED"));
}

export async function dividendPayAction(formData: FormData) {
  const session = await requireStaff();
  try {
    await (await getStore()).update((db) => markDividendPaid(db, session.user.id, String(formData.get("paymentId") ?? "")));
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/dividends?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  redirect(withNotice("/admin/dividends", "DIVIDEND_PAID"));
}

export async function inheritanceAdvanceAction(formData: FormData) {
  const session = await requireStaff();
  const caseId = String(formData.get("caseId") ?? "").trim();
  try {
    await (await getStore()).update((db) =>
      advanceInheritance(
        db,
        session.user.id,
        caseId,
        String(formData.get("to") ?? "") as InheritanceStatus,
        String(formData.get("notes") ?? ""),
        String(formData.get("password") ?? ""),
      ),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(
      `/admin/inheritance?modal=advance&case=${encodeURIComponent(caseId)}&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`,
    );
  }
  redirect(withNotice("/admin/inheritance", "INHERITANCE_UPDATED"));
}

export async function inheritanceApproveAction(formData: FormData) {
  const session = await requireStaff();
  const caseId = String(formData.get("caseId") ?? "").trim();
  try {
    await (await getStore()).update((db) =>
      addInheritanceApproval(
        db,
        session.user.id,
        caseId,
        String(formData.get("evidence") ?? ""),
        String(formData.get("password") ?? ""),
      ),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(
      `/admin/inheritance?modal=approve&case=${encodeURIComponent(caseId)}&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`,
    );
  }
  redirect(withNotice("/admin/inheritance", "INHERITANCE_APPROVED"));
}

export async function inheritanceTransferAction(formData: FormData) {
  const session = await requireStaff();
  const caseId = String(formData.get("caseId") ?? "").trim();
  try {
    await (await getStore()).update((db) =>
      recordInheritanceRegisterUpdate(
        db,
        session.user.id,
        caseId,
        String(formData.get("fromId") ?? ""),
        String(formData.get("toId") ?? ""),
        String(formData.get("shareClassId") ?? ""),
        Number(formData.get("quantity") ?? 0),
        String(formData.get("password") ?? ""),
      ),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(
      `/admin/inheritance?modal=transfer&case=${encodeURIComponent(caseId)}&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`,
    );
  }
  redirect(withNotice("/admin/inheritance", "INHERITANCE_TRANSFERRED"));
}

export async function createStaffAction(formData: FormData) {
  const session = await requireStaff();
  if (!session.roles.includes("platform_admin")) redirect("/admin/staff?error=FORBIDDEN");
  try {
    await (await getStore()).update((db) =>
      createStaffMember(db, session.user.id, {
        email: String(formData.get("email") ?? ""),
        role: String(formData.get("role") ?? "") as Role,
      }),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/staff?modal=new&error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  redirect(withNotice("/admin/staff?ok=created", "STAFF_CREATED"));
}

export async function rotateStaffCodeAction(formData: FormData) {
  const session = await requireStaff();
  if (!session.roles.includes("platform_admin")) redirect("/admin/staff?error=FORBIDDEN");
  try {
    await (await getStore()).update((db) =>
      rotateStaffConfirmationCode(db, session.user.id, String(formData.get("staffId") ?? "")),
    );
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    redirect(`/admin/staff?error=${encodeURIComponent(known?.code ?? "INVALID_STATE")}`);
  }
  redirect(withNotice("/admin/staff?ok=rotated", "STAFF_CODE_ROTATED"));
}

export async function resetDemoAction() {
  const session = await requireStaff();
  if (!session.roles.includes("platform_admin")) throw new AppError("FORBIDDEN");
  await attempt("/admin/settings", async () => (await getStore()).reset());
  redirect(withNotice("/admin/settings", "DEMO_RESET"));
}

export async function currentDemoCode(email: string): Promise<string | null> {
  if (!appConfig.demoMode) return null;
  const user = (await getStore()).db.users.find((item) => item.email === email.trim().toLowerCase());
  if (!user) return null;
  return peekDemoCode(user.id) ?? null;
}

const STAFF_ROLES = [
  "platform_admin",
  "kyc_officer",
  "finance_officer",
  "project_analyst",
  "offering_approver",
  "support_agent",
  "auditor",
] as const;

async function requireStaff() {
  const session = await getSession();
  if (!session || !session.roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role))) {
    redirect("/sign-in");
  }
  return session;
}

async function destinationFor(userId: string, newlyCreated = false): Promise<string> {
  const db = (await getStore()).db;
  const roles = db.userRoles.filter((item) => item.userId === userId).map((item) => item.role);
  if (roles.includes("platform_admin") || roles.includes("kyc_officer") || roles.includes("finance_officer") || roles.includes("project_analyst") || roles.includes("offering_approver") || roles.includes("support_agent") || roles.includes("auditor")) {
    return "/admin";
  }
  if (roles.includes("issuer_manager")) return "/issuer";
  if (newlyCreated || !isInvestorOnboardingComplete(db, userId)) return "/investor/onboarding";
  return "/investor";
}

/** Runs a mutation; failures return to `back` as `?error=CODE` (toast + inline copy) instead of the error page. */
async function attempt<T>(back: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isRedirect(error)) throw error;
    const known = asAppError(error);
    if (!known) console.error("action_failed", describeDbError(error));
    redirect(withError(back, known?.code ?? "INVALID_STATE"));
  }
}

function isRedirect(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT"));
}
