import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { fundingProgress } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-2 text-sm">
      <h1 className="text-3xl font-bold">{tx(locale, "Rapports", "Reports")}</h1>
      {session.db.offerings.map((offering) => {
        const progress = fundingProgress(session.db, offering.id);
        return (
          <article key={offering.id} className="rounded-[24px] bg-white p-4">
            <p className="font-bold">{tx(locale, offering.nameFr, offering.nameEn)}</p>
            <p>{tx(locale, "Initiées", "Initiated")} {progress.initiatedMinor}</p>
            <p>{tx(locale, "Confirmées", "Confirmed")} {progress.confirmedMinor}</p>
            <p>{tx(locale, "Réglées", "Settled")} {progress.settledMinor}</p>
            <p>{tx(locale, "Allouées", "Allotted")} {progress.allottedMinor}</p>
          </article>
        );
      })}
    </div>
  );
}
