import { notFound, redirect } from "next/navigation";
import { cancelSubAction, sandboxPayAction } from "@/server/actions";
import { appConfig } from "@/lib/config";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const { id } = await params;
  const paid = (await searchParams).paid;
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  const subscription = session.db.subscriptions.find((item) => item.id === id && item.investorProfileId === profile?.id);
  if (!subscription) notFound();
  const holding = session.db.shareIssuances.some((item) => item.subscriptionId === subscription.id);
  const sandboxPayments = appConfig.sandboxPaymentsEnabled;
  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{subscription.reference}</h1>
      <p className="text-sm text-muted">{subscription.status}</p>
      <p>
        {subscription.shareQuantity} {tx(locale, "actions demandées", "shares requested")} · {formatMoney(subscription.totalMinor, subscription.currencyCode, locale)}
      </p>
      {paid ? (
        <p className="rounded-2xl bg-lilac p-4 text-sm">
          {tx(
            locale,
            "Le paiement de test (bac à sable) est enregistré. Cette page ne crée pas d'actions.",
            "The sandbox test payment is recorded. This page does not create shares.",
          )}{" "}
          {holding ? tx(locale, "Une émission existe déjà.", "An issuance already exists.") : tx(locale, "Aucune action n'est encore émise.", "No shares are issued yet.")}
        </p>
      ) : null}
      {subscription.status === "PENDING_PAYMENT" ? (
        <div className="space-y-3">
          {sandboxPayments ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                {tx(
                  locale,
                  "Rail de test uniquement — aucun argent réel. Simule un paiement confirmé pour enchaîner KYC, clôture et allotissement.",
                  "Test rail only — no real money. Simulate a confirmed payment so you can exercise KYC, closing and allotment.",
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={sandboxPayAction}>
                  <input type="hidden" name="id" value={subscription.id} />
                  <SubmitButton>
                    {tx(locale, "Simuler le paiement (bac à sable)", "Simulate payment (sandbox)")}
                  </SubmitButton>
                </form>
                <form action={cancelSubAction}>
                  <input type="hidden" name="id" value={subscription.id} />
                  <SubmitButton variant="secondary">
                    {tx(locale, "Annuler", "Cancel")}
                  </SubmitButton>
                </form>
              </div>
            </div>
          ) : (
            <form action={cancelSubAction}>
              <input type="hidden" name="id" value={subscription.id} />
              <SubmitButton variant="secondary">
                {tx(locale, "Annuler", "Cancel")}
              </SubmitButton>
            </form>
          )}
        </div>
      ) : null}
      {subscription.status === "PAID_AWAITING_CLOSING" ? (
        <p className="text-sm">{tx(locale, "Payé, en attente de clôture et d'allotissement. Vous n'êtes pas encore actionnaire pour cette souscription.", "Paid, awaiting closing and allotment. You are not yet a shareholder for this subscription.")}</p>
      ) : null}
      {subscription.status === "ALLOTTED" ? (
        <p className="text-sm">{tx(locale, "Émise sur le registre de démonstration de la plateforme.", "Issued on the platform's demonstration register.")}</p>
      ) : null}
    </div>
  );
}
