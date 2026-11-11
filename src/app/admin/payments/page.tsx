import { refundApproveAction, refundRequestAction, settleAction } from "@/server/actions";
import { errorCopy } from "@/server/domain/errors";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { formatMoney } from "@/lib/format";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function PaymentsAdmin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Paiements", "Payments")}</h1>
      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
      {session.db.payments.map((payment) => (
        <article key={payment.id} className="rounded-[24px] bg-white p-4 text-sm">
          <p className="font-bold">{payment.providerEventId} · {payment.status}</p>
          <p>{formatMoney(payment.amountMinor, payment.currencyCode, locale)} · {payment.subscriptionId}</p>
          {payment.status === "CONFIRMED" ? (
            <form action={settleAction}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <SubmitButton variant="link" size="inline" className="mt-2">{tx(locale, "Marquer réglé", "Mark settled")}</SubmitButton>
            </form>
          ) : null}
          {payment.status !== "REFUNDED" ? (
            <form action={refundRequestAction} className="mt-2 flex gap-2">
              <input type="hidden" name="paymentId" value={payment.id} />
              <input name="reason" placeholder={tx(locale, "Motif", "Reason")} className="h-10 rounded-full border px-3" />
              <SubmitButton variant="secondary" size="sm">{tx(locale, "Demander un remboursement", "Request refund")}</SubmitButton>
            </form>
          ) : null}
        </article>
      ))}
      <h2 className="text-xl font-bold">{tx(locale, "Remboursements", "Refunds")}</h2>
      {session.db.refunds.map((refund) => (
        <form key={refund.id} action={refundApproveAction} className="rounded-[24px] bg-white p-4 text-sm">
          <input type="hidden" name="refundId" value={refund.id} />
          <p>{refund.status} · {formatMoney(refund.amountMinor, refund.currencyCode, locale)} · {refund.reasonCode}</p>
          {refund.status === "REQUESTED" ? (
            <>
              <input name="password" type="password" required placeholder={tx(locale, "Mot de passe d'une autre personne", "Another person's password")} className="mt-2 h-10 rounded-full border px-3" />
              <SubmitButton size="sm" className="ml-2">{tx(locale, "Approuver", "Approve")}</SubmitButton>
            </>
          ) : null}
        </form>
      ))}
    </div>
  );
}
