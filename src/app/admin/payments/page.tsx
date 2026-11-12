import { ModalOpenLink, SearchParamValueModal } from "@/components/search-param-modal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
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

  const paymentColumns: DataTableColumn[] = [
    { id: "event", header: tx(locale, "Événement", "Event"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.payments.map((payment) => payment.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
    { id: "subscription", header: tx(locale, "Souscription", "Subscription"), hideOnMobile: true },
  ];

  const paymentRows: DataTableRow[] = session.db.payments.map((payment) => {
    const amount = formatMoney(payment.amountMinor, payment.currencyCode, locale);
    return {
      id: payment.id,
      searchValue: `${payment.providerEventId} ${payment.status} ${amount} ${payment.subscriptionId}`,
      filterValues: { status: payment.status },
      sortValues: {
        event: payment.providerEventId,
        status: payment.status,
        amount: payment.amountMinor,
        subscription: payment.subscriptionId,
      },
      cells: {
        event: <span className="font-semibold">{payment.providerEventId}</span>,
        status: payment.status,
        amount,
        subscription: payment.subscriptionId,
      },
      actions: (
        <>
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
        </>
      ),
    };
  });

  const refundColumns: DataTableColumn[] = [
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.refunds.map((refund) => refund.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
    { id: "reason", header: tx(locale, "Motif", "Reason"), sortable: true },
  ];

  const refundRows: DataTableRow[] = session.db.refunds.map((refund) => {
    const amount = formatMoney(refund.amountMinor, refund.currencyCode, locale);
    return {
      id: refund.id,
      searchValue: `${refund.status} ${amount} ${refund.reasonCode}`,
      filterValues: { status: refund.status },
      sortValues: {
        status: refund.status,
        amount: refund.amountMinor,
        reason: refund.reasonCode,
      },
      cells: {
        status: refund.status,
        amount,
        reason: refund.reasonCode,
      },
      actions:
        refund.status === "REQUESTED" ? (
          <ModalOpenLink
            href={`/admin/payments?approve=${encodeURIComponent(refund.id)}`}
            className="inline-flex rounded-full bg-violet px-3 py-1.5 text-xs font-semibold text-white"
          >
            {tx(locale, "Approuver", "Approve")}
          </ModalOpenLink>
        ) : null,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tx(locale, "Paiements", "Payments")}</h1>
      <DataTable
        locale={locale}
        columns={paymentColumns}
        rows={paymentRows}
        emptyMessage={tx(locale, "Aucun paiement.", "No payments.")}
      />

      <h2 className="text-xl font-bold">{tx(locale, "Remboursements", "Refunds")}</h2>
      <DataTable
        locale={locale}
        columns={refundColumns}
        rows={refundRows}
        emptyMessage={tx(locale, "Aucun remboursement.", "No refunds.")}
      />

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
