import { describe, expect, it } from "vitest";
import { createDemoDatabase, DEMO_PASSWORD, ids } from "@/server/db/seed";
import { Store } from "@/server/db/store";
import {
  dividendAmounts,
  fundingProgress,
  holdingQuantity,
  ledgerBalances,
  quoteSubscription,
  transactionBalances,
} from "@/server/domain/finance";
import {
  applySandboxPayment,
  approveAllotment,
  createSubscription,
  completeInvestorOnboarding,
  isInvestorOnboardingComplete,
  linkOrCreateClerk,
  linkOrCreateGoogle,
  prepareAllotment,
  registerUser,
  reportDeath,
  saveNomination,
  submitIdentityDocument,
  submitIssuerUpdate,
  updateInvestorDetails,
  verifyEmail,
} from "@/server/domain/mutate";
import { AppError } from "@/server/domain/errors";

function store() {
  return new Store(createDemoDatabase());
}

describe("money and ownership rules", async () => {
  const db = createDemoDatabase();

  it("keeps every posted ledger transaction balanced", async () => {
    for (const tx of transactionBalances(db)) {
      expect(tx.debit).toBe(tx.credit);
      expect(tx.debit).toBeGreaterThan(0);
    }
    const totals = ledgerBalances(db);
    expect(totals.USD.debit).toBe(totals.USD.credit);
    expect(totals.USD.debit).toBe(250_000);
  });

  it("rejects a remainder instead of discarding it", async () => {
    const quote = quoteSubscription({
      amountMinor: 10_050,
      issuePriceMinor: 2_500,
      fractionalSharesAllowed: false,
      minimumSubscriptionMinor: 10_000,
      maximumSubscriptionMinor: 500_000,
      minimumShares: 4,
      maximumShares: 200,
      feeMinor: 0,
    });
    expect(quote.ok).toBe(false);
    if (!quote.ok) expect(quote.error).toBe("NOT_WHOLE_SHARES");
  });

  it("quotes an exact share quantity and a zero fee", async () => {
    const quote = quoteSubscription({
      amountMinor: 10_000,
      issuePriceMinor: 2_500,
      fractionalSharesAllowed: false,
      minimumSubscriptionMinor: 10_000,
      maximumSubscriptionMinor: 500_000,
      minimumShares: 4,
      maximumShares: 200,
      feeMinor: 0,
    });
    expect(quote).toMatchObject({ ok: true, shareQuantity: 4, grossMinor: 10_000, totalMinor: 10_000, remainderMinor: 0 });
  });

  it("separates initiated, confirmed, settled and allotted amounts", async () => {
    const progress = fundingProgress(db, ids.offering);
    expect(progress.initiatedMinor).toBe(40_000 + 60_000 + 50_000 + 25_000);
    expect(progress.confirmedMinor).toBe(40_000 + 60_000 + 50_000);
    expect(progress.settledMinor).toBe(40_000);
    expect(progress.allottedMinor).toBe(40_000 + 60_000);
  });

  it("calculates gross, withholding and net dividends in minor units", async () => {
    expect(dividendAmounts(40, 50, 1_000)).toEqual({ gross: 2_000, withholding: 200, net: 1_800 });
    expect(dividendAmounts(40, 30, 1_000)).toEqual({ gross: 1_200, withholding: 120, net: 1_080 });
  });

  it("does not create a holding when a sandbox payment is confirmed, and ignores a duplicate event", async () => {
    const memory = store();
    const before = holdingQuantity(memory.db, ids.profileJean, ids.issuer, ids.shareClass);
    expect(before).toBe(0);
    const first = await memory.update((draft) =>
      applySandboxPayment(draft, {
        providerEventId: "evt-jean-1",
        providerTransactionId: "txn-new",
        subscriptionId: ids.subJean,
        amountMinor: 50_000,
        currencyCode: "USD",
      }),
    );
    expect(first.duplicate).toBe(true);
    expect(holdingQuantity(memory.db, ids.profileJean, ids.issuer, ids.shareClass)).toBe(0);
    expect(memory.db.subscriptions.find((item) => item.id === ids.subJean)?.status).toBe("PAID_AWAITING_CLOSING");
  });

  it("blocks the preparer from approving their own allotment, then lets a different officer issue shares", async () => {
    const memory = store();
    const batchId = await memory.update((draft) => prepareAllotment(draft, ids.finance, ids.offering, [ids.subJean]));
    await expect(memory.update((draft) => approveAllotment(draft, ids.finance, batchId, "DEMO-REG-2", DEMO_PASSWORD))).rejects.toBeInstanceOf(AppError);
    await memory.update((draft) => approveAllotment(draft, ids.approver, batchId, "DEMO-REG-2", DEMO_PASSWORD));
    expect(holdingQuantity(memory.db, ids.profileJean, ids.issuer, ids.shareClass)).toBe(20);
    expect(memory.db.subscriptions.find((item) => item.id === ids.subJean)?.status).toBe("ALLOTTED");
    expect(memory.db.companyFinancings.some((item) => item.subscriptionId === ids.subJean && item.amountMinor === 50_000)).toBe(true);
  });

  it("lets citizens from 18 through 35 buy, and refuses anyone outside that range", async () => {
    const memory = store();
    const subscribe = (userId: string) =>
      memory.update((draft) =>
        createSubscription(draft, userId, {
          offeringId: ids.offering,
          amountMinor: 10_000,
          documentIds: [ids.docMemo, ids.docAgree, ids.docRisk],
          riskAccepted: true,
        }),
      );
    await expect(subscribe(ids.amina)).resolves.toBeDefined();
    await memory.update((draft) => {
      const profile = draft.investorProfiles.find((item) => item.id === ids.profileAmina)!;
      profile.dateOfBirth = "2008-11-11";
    });
    await expect(subscribe(ids.amina)).rejects.toBeInstanceOf(AppError);
    await memory.update((draft) => {
      const profile = draft.investorProfiles.find((item) => item.id === ids.profileAmina)!;
      profile.dateOfBirth = "1990-11-09";
    });
    await expect(subscribe(ids.amina)).rejects.toBeInstanceOf(AppError);
    await memory.update((draft) => {
      const profile = draft.investorProfiles.find((item) => item.id === ids.profileAmina)!;
      profile.dateOfBirth = "2008-11-10";
    });
    await expect(subscribe(ids.amina)).resolves.toBeDefined();
  });

  it("activates nominations only at exactly 100%", async () => {
    const people = (bps: number[]) =>
      bps.map((value, index) => ({
        fullName: `Personne ${index}`,
        relationship: "Ami",
        email: `p${index}@demo.jeunese.test`,
        phone: `+24381111000${index}`,
        bps: value,
        gender: index % 2 === 0 ? "female" : "male",
      }));
    const memory = store();
    await expect(memory.update((draft) =>
        saveNomination(draft, ids.amina, { activate: true, acknowledgement: true, people: people([6_000, 3_999]) }),
      )).rejects.toBeInstanceOf(AppError);
    await expect(memory.update((draft) =>
        saveNomination(draft, ids.amina, { activate: true, acknowledgement: true, people: people([6_000, 4_001]) }),
      )).rejects.toBeInstanceOf(AppError);
    await memory.update((draft) =>
      saveNomination(draft, ids.amina, { activate: true, acknowledgement: true, people: people([5_000, 3_000, 2_000]) }),
    );
    const active = memory.db.nominationSets.filter(
      (item) => item.investorProfileId === ids.profileAmina && item.status === "ACTIVE",
    );
    expect(active).toHaveLength(1);
    expect(active[0]?.totalBps).toBe(10_000);
  });

  it("never moves shares when a death is reported", async () => {
    const memory = store();
    const before = memory.db.shareholdingEvents.length;
    await memory.update((draft) => reportDeath(draft, ids.amina, ids.profileAmina, "CD", "Signalement seulement"));
    expect(memory.db.shareholdingEvents).toHaveLength(before);
    expect(memory.db.inheritanceCases[0]?.status).toBe("REPORTED");
    expect(memory.db.inheritanceCases[0]?.registerUpdated).toBe(false);
  });

  it("requires a verified email, phone and approved identity before subscribing", async () => {
    const memory = store();
    const registered = await memory.update((draft) =>
      registerUser(draft, {
        firstName: "Test",
        lastName: "User",
        email: "new.investor@demo.jeunese.test",
        phone: "+243812345678",
        password: "Sup3r-secret",
        country: "CD",
        language: "fr",
        acceptTerms: true,
        gender: "female",
        dateOfBirth: "2000-05-01",
      }),
    );
    const created = memory.db.investorProfiles.find((item) => item.userId === registered.userId);
    expect(created?.gender).toBe("female");
    expect(memory.db.users.find((item) => item.id === registered.userId)?.gender).toBe("female");
    await expect(memory.update((draft) =>
        createSubscription(draft, registered.userId, {
          offeringId: ids.offering,
          amountMinor: 10_000,
          documentIds: [ids.docMemo, ids.docAgree, ids.docRisk],
          riskAccepted: true,
        }),
      )).rejects.toBeInstanceOf(AppError);
    await memory.update((draft) => verifyEmail(draft, "new.investor@demo.jeunese.test", registered.code));
    await memory.update((draft) => {
      const profile = draft.investorProfiles.find((item) => item.userId === registered.userId)!;
      profile.countryOfResidence = null;
    });
    await expect(memory.update((draft) =>
        createSubscription(draft, registered.userId, {
          offeringId: ids.offering,
          amountMinor: 10_000,
          documentIds: [ids.docMemo, ids.docAgree, ids.docRisk],
          riskAccepted: true,
        }),
      )).rejects.toBeInstanceOf(AppError);
  });

  it("flags a passport issued outside the country of residence and does not approve it automatically", async () => {
    const memory = store();
    const result = await memory.update((draft) =>
      submitIdentityDocument(draft, ids.grace, {
        documentType: "passport",
        issuingCountry: "FR",
        documentNumber: "FR-DEMO",
        expiryDate: "2030-01-01",
      }),
    );
    expect(result.manualReviewRequired).toBe(true);
    const profile = memory.db.investorProfiles.find((item) => item.id === ids.profileGrace);
    expect(profile?.onboardingStatus).toBe("SUBMITTED");
    await expect(memory.update((draft) =>
        createSubscription(draft, ids.grace, {
          offeringId: ids.offering,
          amountMinor: 10_000,
          documentIds: [ids.docMemo, ids.docAgree, ids.docRisk],
          riskAccepted: true,
        }),
      )).rejects.toBeInstanceOf(AppError);
  });

  it("requires a chosen gender and does not let gender unlock a subscription", async () => {
    const memory = store();
    const input = {
      firstName: "Grace",
      middleName: "",
      lastName: "Mbuyi",
      phone: "+243810000003",
      country: "CD",
      language: "fr" as const,
      dateOfBirth: "1995-01-01",
      nationality: "CD",
      addressLine: "Adresse fictive",
      city: "Kinshasa",
      taxResidency: "CD",
      taxId: "",
      sourceOfFunds: "Salaire",
      pepStatus: "NO" as const,
      payoutLabel: "",
      gender: "",
    };
    await expect(memory.update((draft) => updateInvestorDetails(draft, ids.grace, input))).rejects.toBeInstanceOf(AppError);
    await memory.update((draft) => updateInvestorDetails(draft, ids.grace, { ...input, gender: "female" }));
    expect(memory.db.investorProfiles.find((item) => item.id === ids.profileGrace)?.gender).toBe("female");
    expect(memory.db.users.find((item) => item.id === ids.grace)?.gender).toBe("female");
    await expect(memory.update((draft) =>
        createSubscription(draft, ids.grace, {
          offeringId: ids.offering,
          amountMinor: 10_000,
          documentIds: [ids.docMemo, ids.docAgree, ids.docRisk],
          riskAccepted: true,
        }),
      )).rejects.toBeInstanceOf(AppError);
    expect(memory.db.users.find((item) => item.id === ids.amina)?.gender).toBe("female");
  });

  it("refuses to take over a password account through Google", async () => {
    const memory = store();
    await expect(memory.update((draft) =>
        linkOrCreateGoogle(draft, null, {
          email: "amina@demo.jeunese.test",
          subject: "other-google-subject",
          emailVerified: true,
        }),
      )).rejects.toBeInstanceOf(AppError);
  });

  it("refuses an issuer update for a company the user does not represent", async () => {
    const memory = store();
    await expect(memory.update((draft) =>
        submitIssuerUpdate(draft, ids.amina, {
          projectId: ids.project,
          titleFr: "Non",
          titleEn: "No",
          bodyFr: "Non",
          bodyEn: "No",
        }),
      )).rejects.toBeInstanceOf(AppError);
  });

  it("refuses subscriptions to a draft offering", async () => {
    const memory = store();
    await expect(memory.update((draft) =>
        createSubscription(draft, ids.amina, {
          offeringId: ids.draftOffering,
          amountMinor: 10_000,
          documentIds: [],
          riskAccepted: true,
        }),
      )).rejects.toBeInstanceOf(AppError);
  });

  it("creates a Clerk-linked investor as new and sends them through onboarding", async () => {
    const memory = store();
    const created = await memory.update((draft) =>
      linkOrCreateClerk(draft, {
        clerkUserId: "clerk_user_new",
        email: "clerk.new@demo.jeunese.test",
        firstName: "Clerk",
        lastName: "Nouveau",
        profile: {
          phone: "+243812345679",
          country: "CD",
          gender: "female",
          dateOfBirth: "1998-06-01",
          language: "fr",
        },
      }),
    );
    expect(created.created).toBe(true);
    expect(isInvestorOnboardingComplete(memory.db, created.userId)).toBe(false);
    const again = await memory.update((draft) =>
      linkOrCreateClerk(draft, {
        clerkUserId: "clerk_user_new",
        email: "clerk.new@demo.jeunese.test",
        firstName: "Clerk",
        lastName: "Nouveau",
      }),
    );
    expect(again.created).toBe(false);
    expect(again.userId).toBe(created.userId);
  });

  it("links an existing email to Clerk without treating them as newly created", async () => {
    const memory = store();
    const linked = await memory.update((draft) =>
      linkOrCreateClerk(draft, {
        clerkUserId: "clerk_amina",
        email: "amina@demo.jeunese.test",
        firstName: "Amina",
        lastName: "Lukusa",
      }),
    );
    expect(linked.created).toBe(false);
    expect(linked.userId).toBe(ids.amina);
    expect(isInvestorOnboardingComplete(memory.db, linked.userId)).toBe(true);
  });

  it("completes onboarding without approving KYC and enforces age 18–35", async () => {
    const memory = store();
    const created = await memory.update((draft) =>
      linkOrCreateClerk(draft, {
        clerkUserId: "clerk_onboard",
        email: "onboard@demo.jeunese.test",
        firstName: "New",
        lastName: "Citizen",
      }),
    );
    const kycBefore = memory.db.kycCases.find(
      (item) => item.investorProfileId === memory.db.investorProfiles.find((profile) => profile.userId === created.userId)?.id,
    );
    expect(kycBefore?.status).toBe("NOT_STARTED");
    await expect(
      memory.update((draft) =>
        completeInvestorOnboarding(draft, created.userId, {
          firstName: "New",
          middleName: "",
          lastName: "Citizen",
          phone: "+243812345680",
          country: "CD",
          language: "fr",
          dateOfBirth: "2012-01-01",
          nationality: "CD",
          addressLine: "Kin",
          city: "Kinshasa",
          taxResidency: "CD",
          taxId: "",
          sourceOfFunds: "Salaire",
          pepStatus: "NO",
          payoutLabel: "",
          gender: "female",
        }),
      ),
    ).rejects.toBeInstanceOf(AppError);
    await memory.update((draft) =>
      completeInvestorOnboarding(draft, created.userId, {
        firstName: "New",
        middleName: "M",
        lastName: "Citizen",
        phone: "+243812345680",
        country: "CD",
        language: "fr",
        dateOfBirth: "1999-03-15",
        nationality: "CD",
        addressLine: "Kin",
        city: "Kinshasa",
        taxResidency: "CD",
        taxId: "",
        sourceOfFunds: "Salaire",
        pepStatus: "NO",
        payoutLabel: "",
        gender: "female",
      }),
    );
    expect(isInvestorOnboardingComplete(memory.db, created.userId)).toBe(true);
    const profile = memory.db.investorProfiles.find((item) => item.userId === created.userId);
    const kyc = memory.db.kycCases.find((item) => item.investorProfileId === profile?.id);
    expect(profile?.onboardingStatus).toBe("IN_PROGRESS");
    expect(kyc?.status).toBe("NOT_STARTED");
  });
});
