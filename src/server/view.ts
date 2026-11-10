import { fundingProgress, holdingQuantity, issuedQuantity, rolesFor } from "./domain/finance";
import type { Database } from "./domain/types";

export function confirmedCapitalMinor(db: Database, profileId: string): number {
  return db.subscriptions
    .filter((item) => item.investorProfileId === profileId && item.status === "ALLOTTED")
    .reduce((sum, item) => sum + item.amountMinor, 0);
}

export function investorSnapshot(db: Database, userId: string) {
  const user = db.users.find((item) => item.id === userId);
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  if (!user || !profile) return null;
  const holdings = db.shareClasses
    .map((shareClass) => {
      const quantity = holdingQuantity(db, profile.id, shareClass.issuerId, shareClass.id);
      if (quantity === 0) return null;
      const issuer = db.issuers.find((item) => item.id === shareClass.issuerId)!;
      const issued = issuedQuantity(db, shareClass.issuerId, shareClass.id);
      const issuances = db.shareIssuances.filter(
        (item) => item.investorProfileId === profile.id && item.shareClassId === shareClass.id && item.status === "ISSUED",
      );
      return { shareClass, issuer, quantity, issued, issuances };
    })
    .filter((item) => item !== null);

  const dividends = db.dividendEntitlements
    .filter((item) => item.investorProfileId === profile.id)
    .map((entitlement) => {
      const declaration = db.dividendDeclarations.find((item) => item.id === entitlement.declarationId)!;
      const payment = db.dividendPayments.find((item) => item.entitlementId === entitlement.id);
      const issuer = db.issuers.find((item) => item.id === declaration.issuerId)!;
      return { entitlement, declaration, payment, issuer };
    });

  const subscriptions = db.subscriptions
    .filter((item) => item.investorProfileId === profile.id)
    .map((subscription) => ({
      subscription,
      offering: db.offerings.find((item) => item.id === subscription.offeringId)!,
      project: db.projects.find((item) => item.id === db.offerings.find((row) => row.id === subscription.offeringId)?.projectId)!,
    }));

  const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
  const series = months.map((month) => {
    const end = `${month}-31T23:59:59.000Z`;
    return db.shareIssuances
      .filter((item) => item.investorProfileId === profile.id && item.status === "ISSUED" && item.createdAt <= end)
      .reduce((sum, item) => sum + item.shareQuantity * item.issuePriceMinor, 0);
  });

  return {
    user,
    profile,
    roles: rolesFor(db, userId),
    holdings,
    dividends,
    subscriptions,
    confirmedMinor: confirmedCapitalMinor(db, profile.id),
    shareCount: holdings.reduce((sum, item) => sum + item.quantity, 0),
    issuerCount: new Set(holdings.map((item) => item.issuer.id)).size,
    series,
    months,
    notifications: db.notifications.filter((item) => item.userId === userId),
    kin: db.nextOfKin.filter((item) => item.investorProfileId === profile.id),
    nominations: db.nominationSets.filter((item) => item.investorProfileId === profile.id),
    kyc: db.kycCases.find((item) => item.investorProfileId === profile.id) ?? null,
  };
}

export function publicProjects(db: Database) {
  return db.projects
    .filter((project) => project.status === "PUBLISHED")
    .map((project) => {
      const issuer = db.issuers.find((item) => item.id === project.issuerId)!;
      const offering = db.offerings.find((item) => item.projectId === project.id && item.status === "OPEN");
      const progress = offering ? fundingProgress(db, offering.id) : null;
      const terms = offering ? db.offeringShareTerms.find((item) => item.offeringId === offering.id) : undefined;
      return { project, issuer, offering, progress, terms };
    })
    .filter((item) => item.offering);
}

export function activityFeed(db: Database, userId: string) {
  const profile = db.investorProfiles.find((item) => item.userId === userId);
  const rows: { id: string; at: string; titleFr: string; titleEn: string; amount: string; positive: boolean }[] = [];
  if (!profile) return rows;
  for (const payment of db.payments) {
    const sub = db.subscriptions.find((item) => item.id === payment.subscriptionId && item.investorProfileId === profile.id);
    if (!sub) continue;
    rows.push({
      id: payment.id,
      at: payment.confirmedAt ?? payment.createdAt,
      titleFr: "Paiement de souscription confirmé",
      titleEn: "Subscription payment confirmed",
      amount: `+${(payment.amountMinor / 100).toFixed(2)} ${payment.currencyCode}`,
      positive: true,
    });
  }
  for (const issuance of db.shareIssuances.filter((item) => item.investorProfileId === profile.id)) {
    rows.push({
      id: issuance.id,
      at: issuance.createdAt,
      titleFr: "Actions inscrites au registre",
      titleEn: "Shares entered on the register",
      amount: `${issuance.shareQuantity}`,
      positive: true,
    });
  }
  for (const item of db.dividendPayments) {
    const entitlement = db.dividendEntitlements.find((row) => row.id === item.entitlementId && row.investorProfileId === profile.id);
    if (!entitlement) continue;
    rows.push({
      id: item.id,
      at: item.paidAt ?? item.createdAt,
      titleFr: item.status === "PAID" ? "Dividende payé" : "Dividende déclaré, paiement en attente",
      titleEn: item.status === "PAID" ? "Dividend paid" : "Dividend declared, payment pending",
      amount: `${(item.amountMinor / 100).toFixed(2)} ${item.currencyCode}`,
      positive: item.status === "PAID",
    });
  }
  return rows.sort((a, b) => (a.at < b.at ? 1 : -1));
}
