import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SubscribeForm } from "@/components/subscribe-form";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { eligibilityErrors } from "@/server/domain/mutate";
import { errorCopy } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

export default async function OfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const { offerId } = await params;
  const offering = session.db.offerings.find((item) => item.id === offerId);
  if (!offering) notFound();
  const project = session.db.projects.find((item) => item.id === offering.projectId);
  const docs = session.db.offeringDocuments.filter((item) => item.offeringId === offering.id);
  const blockers = eligibilityErrors(session.db, session.user.id, offering.id);
  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, offering.nameFr, offering.nameEn)}</h1>
      <p className="text-sm text-muted">{project ? tx(locale, project.titleFr, project.titleEn) : ""}</p>
      <p className="text-sm">
        {tx(locale, "Minimum", "Minimum")} {formatMoney(offering.minimumSubscriptionMinor, offering.currencyCode, locale)} · {tx(locale, "frais", "fee")} {formatMoney(offering.feeMinor, offering.currencyCode, locale)}
      </p>
      {blockers.length > 0 ? (
        <div className="rounded-[28px] bg-white p-5 text-sm">
          <p className="font-semibold">{tx(locale, "Souscription bloquée", "Subscription blocked")}</p>
          <ul className="mt-2 list-disc pl-5">
            {blockers.map((code) => (
              <li key={code}>{errorCopy[code]?.[locale] ?? code}</li>
            ))}
          </ul>
          <Link href="/investor/onboarding" className="mt-3 inline-block font-semibold text-violet">
            {tx(locale, "Compléter le dossier", "Complete the file")}
          </Link>
        </div>
      ) : (
        <SubscribeForm
          locale={locale}
          offeringId={offering.id}
          documents={docs.map((doc) => ({ id: doc.id, title: tx(locale, doc.titleFr, doc.titleEn) }))}
        />
      )}
    </div>
  );
}
