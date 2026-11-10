import { tx } from "@/lib/i18n/tx";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { getSession } from "@/server/auth/session";
import { fundingProgress } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const db = session.db;
  const byStatus = db.investorProfiles.reduce<Record<string, number>>((acc, item) => {
    acc[item.onboardingStatus] = (acc[item.onboardingStatus] ?? 0) + 1;
    return acc;
  }, {});
  const offering = db.offerings.find((item) => item.status === "OPEN");
  const progress = offering ? fundingProgress(db, offering.id) : null;
  const cards = [
    [tx(locale, "Investisseurs", "Investors"), String(db.investorProfiles.length)],
    [tx(locale, "Émetteurs actifs", "Active issuers"), String(db.issuers.filter((item) => item.companyStatus === "ACTIVE").length)],
    [tx(locale, "Offres ouvertes", "Open offerings"), String(db.offerings.filter((item) => item.status === "OPEN").length)],
    [tx(locale, "Souscriptions payées non émises", "Paid, not issued"), String(db.subscriptions.filter((item) => item.status === "PAID_AWAITING_CLOSING").length)],
    [tx(locale, "Lots en préparation", "Batches prepared"), String(db.allotmentBatches.filter((item) => item.status === "PREPARED").length)],
    [tx(locale, "Tickets ouverts", "Open tickets"), String(db.supportTickets.filter((item) => item.status !== "CLOSED").length)],
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Pilotage", "Operations")}</h1>
      <p className="text-sm text-muted">{tx(locale, "Les montants confirmés et réglés sont séparés. Rien ici n'est appelé « fonds levés ».", "Confirmed and settled amounts stay separate. Nothing here is called “funds raised”.")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-[24px] bg-white p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </article>
        ))}
      </div>
      <article className="rounded-[24px] bg-white p-4 text-sm">
        <h2 className="font-bold">{tx(locale, "Vérification", "Verification")}</h2>
        {Object.entries(byStatus).map(([status, count]) => (
          <p key={status}>{status}: {count}</p>
        ))}
      </article>
      {progress ? (
        <article className="rounded-[24px] bg-violet p-4 text-sm text-white">
          <p>{tx(locale, "Paiements confirmés", "Confirmed payments")}: {(progress.confirmedMinor / 100).toFixed(2)} USD</p>
          <p>{tx(locale, "Réglés", "Settled")}: {(progress.settledMinor / 100).toFixed(2)} USD</p>
          <p>{tx(locale, "Alloués", "Allotted")}: {(progress.allottedMinor / 100).toFixed(2)} USD</p>
        </article>
      ) : null}
    </div>
  );
}
