import { ModalOpenLink, SearchParamValueModal } from "@/components/search-param-modal";
import { refundApproveAction, refundRequestAction, settleAction } from "@/server/actions";
import { errorCopy } from "@/server/domain/errors";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { formatMoney } from "@/lib/format";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function PaymentsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; refund?: string; approve?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const params = await searchParams;
  const error = params.error;
  const refundPaymentId = params.refund;
  const approveRefundId = params.approve;
  const approveRefund = approveRefundId
    ? session.db.refunds.find((item) => item.id === approveRefundId)
    : undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Paiements", "Payments")}</h1>
      {session.db.payments.map((payment) => (
        <article key={payment.id} className="rounded-[24px] bg-white p-4 text-sm">
          <p className="font-bold">
            {payment.providerEventId} · {payment.status}
          </p>
          <p>
            {formatMoney(payment.amountMinor, payment.currencyCode, locale)} · {payment.subscriptionId}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {payment.status === "CONFIRMED" ? (
              <form action={settleAction}>
                <input type="hidden" name="paymentId" value={payment.id} />
                <SubmitButton variant="link" size="inline">
                  {tx(locale, "Marquer réglé", "Mark settled")}
                </SubmitButton>
              </form>
            ) : null}
            {payment.status !== "REFUNDED" ? (
              <ModalOpenLink
                href={`/admin/payments?refund=${encodeURIComponent(payment.id)}`}
                className="text-sm font-semibold text-violet underline-offset-2 hover:underline"
              >
                {tx(locale, "Demander un remboursement", "Request refund")}
              </ModalOpenLink>
            ) : null}
          </div>
        </article>
      ))}
      <h2 className="text-xl font-bold">{tx(locale, "Remboursements", "Refunds")}</h2>
      {session.db.refunds.map((refund) => (
        <article key={refund.id} className="rounded-[24px] bg-white p-4 text-sm">
          <p>
            {refund.status} · {formatMoney(refund.amountMinor, refund.currencyCode, locale)} · {refund.reasonCode}
          </p>
          {refund.status === "REQUESTED" ? (
            <ModalOpenLink
              href={`/admin/payments?approve=${encodeURIComponent(refund.id)}`}
              className="mt-2 inline-flex rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
            >
              {tx(locale, "Approuver", "Approve")}
            </ModalOpenLink>
          ) : null}
        </article>
      ))}

      {refundPaymentId ? (
        <SearchParamValueModal
          param="refund"
          clearKeys={["error", "approve"]}
          title={tx(locale, "Demander un remboursement", "Request refund")}
        >
          <form action={refundRequestAction} className="space-y-2">
            {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
            <input type="hidden" name="paymentId" value={refundPaymentId} />
            <input
              name="reason"
              required
              placeholder={tx(locale, "Motif", "Reason")}
              className="h-12 w-full rounded-2xl border px-3"
            />
            <SubmitButton size="sm">{tx(locale, "Demander un remboursement", "Request refund")}</SubmitButton>
          </form>
        </SearchParamValueModal>
      ) : null}

      {approveRefundId ? (
        <SearchParamValueModal
          param="approve"
          clearKeys={["error", "refund"]}
          title={tx(locale, "Approuver le remboursement", "Approve refund")}
        >
          <form action={refundApproveAction} className="space-y-2">
            {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
            <input type="hidden" name="refundId" value={approveRefundId} />
            {approveRefund ? (
              <p className="text-sm text-muted">
                {formatMoney(approveRefund.amountMinor, approveRefund.currencyCode, locale)} ·{" "}
                {approveRefund.reasonCode}
              </p>
            ) : null}
            <input
              name="password"
              type="password"
              required
              placeholder={tx(locale, "Mot de passe d'une autre personne", "Another person's password")}
              className="h-12 w-full rounded-2xl border px-3"
            />
            <SubmitButton size="sm">{tx(locale, "Approuver", "Approve")}</SubmitButton>
          </form>
        </SearchParamValueModal>
      ) : null}
    </div>
  );
}
