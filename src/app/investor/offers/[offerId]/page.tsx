import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InterestForm } from "@/components/interest-form";
import { OfferingCountdown } from "@/components/offering-countdown";
import { SubscribeForm } from "@/components/subscribe-form";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { getStore } from "@/server/db/store";
import { runOfferingReminderSweep } from "@/server/actions";
import { canExpressInterest, eligibilityErrors, interestDemand } from "@/server/domain/mutate";
import { errorCopy } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

export default async function OfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const { offerId } = await params;
  try {
    await runOfferingReminderSweep();
  } catch {
    /* cron also covers reminders */
  }
  const db = (await getStore()).db;
  const offering = db.offerings.find((item) => item.id === offerId);
  if (!offering) notFound();
  const project = db.projects.find((item) => item.id === offering.projectId);
  const docs = db.offeringDocuments.filter((item) => item.offeringId === offering.id);
  const blockers = eligibilityErrors(db, session.user.id, offering.id);
  const interestOpen = canExpressInterest(db, offering.id);
  const profile = db.investorProfiles.find((item) => item.userId === session.user.id);
  const existingInterest =
    profile &&
    db.offeringInterests.find(
      (item) =>
        item.offeringId === offering.id &&
        item.investorProfileId === profile.id &&
        item.status === "ACTIVE",
    );
  const demand = interestDemand(db, offering.id);
  const canSubscribe = blockers.length === 0;
  const opensInFuture = Date.parse(offering.opensAt) > Date.now();

  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, offering.nameFr, offering.nameEn)}</h1>
      <p className="text-sm text-muted">{project ? tx(locale, project.titleFr, project.titleEn) : ""}</p>
      <p className="text-sm">
        {tx(locale, "Statut", "Status")} <strong>{offering.status}</strong> · {tx(locale, "Minimum", "Minimum")}{" "}
        {formatMoney(offering.minimumSubscriptionMinor, offering.currencyCode, locale)} · {tx(locale, "frais", "fee")}{" "}
        {formatMoney(offering.feeMinor, offering.currencyCode, locale)}
      </p>

      {opensInFuture ? <OfferingCountdown locale={locale} opensAt={offering.opensAt} /> : null}

      {interestOpen || demand.count > 0 ? (
        <div className="rounded-[24px] border border-border bg-[var(--surface-muted)] p-4 text-sm">
          <p className="font-semibold">{tx(locale, "Demande indicative", "Indicative demand")}</p>
          <p className="mt-1 text-muted">
            {demand.count} {tx(locale, "investisseur(s)", "investor(s)")} ·{" "}
            {formatMoney(demand.amountMinor, offering.currencyCode, locale)} · {demand.shareQuantity}{" "}
            {tx(locale, "actions", "shares")} · {tx(locale, "objectif min", "min target")}{" "}
            {formatMoney(offering.minimumRaiseMinor, offering.currencyCode, locale)}
          </p>
        </div>
      ) : null}

      {canSubscribe ? (
        <>
          <SubscribeForm
            locale={locale}
            offeringId={offering.id}
            documents={docs.map((doc) => ({ id: doc.id, title: tx(locale, doc.titleFr, doc.titleEn) }))}
          />
          {existingInterest ? (
            <p className="text-sm text-muted">
              {tx(
                locale,
                `Votre intérêt enregistré (${formatMoney(existingInterest.intendedAmountMinor, offering.currencyCode, locale)}) peut guider votre souscription.`,
                `Your saved interest (${formatMoney(existingInterest.intendedAmountMinor, offering.currencyCode, locale)}) can guide your subscription.`,
              )}
            </p>
          ) : null}
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[28px] bg-white p-5 text-sm">
            <p className="font-semibold">{tx(locale, "Souscription bloquée", "Subscription blocked")}</p>
            <ul className="mt-2 list-disc pl-5">
              {blockers.map((code) => (
                <li key={code}>{errorCopy[code]?.[locale] ?? code}</li>
              ))}
            </ul>
            {blockers.some(
              (code) => code === "KYC_REQUIRED" || code === "PROFILE_INCOMPLETE" || code === "EMAIL_UNVERIFIED",
            ) ? (
              <Link href="/investor/onboarding" className="mt-3 inline-block font-semibold text-violet">
                {tx(locale, "Compléter le dossier", "Complete the file")}
              </Link>
            ) : null}
          </div>

          {interestOpen ? (
            <InterestForm
              locale={locale}
              offeringId={offering.id}
              currencyCode={offering.currencyCode}
              minimumLabel={formatMoney(offering.minimumSubscriptionMinor, offering.currencyCode, locale)}
              existing={
                existingInterest
                  ? {
                      id: existingInterest.id,
                      intendedAmountMinor: existingInterest.intendedAmountMinor,
                      intendedShareQuantity: existingInterest.intendedShareQuantity,
                      remindAtOpen: existingInterest.remindAtOpen,
                    }
                  : null
              }
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
