import Link from "next/link";
import { DatePicker } from "@/components/ui/date-picker";
import { EntitySelect } from "@/components/choice-fields";
import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { dividendApproveAction, dividendPayAction, dividendProposeAction } from "@/server/actions";
import { errorCopy } from "@/server/domain/errors";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { formatMoney } from "@/lib/format";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function DividendsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; modal?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  const issuers = session.db.issuers;
  const shareClasses = session.db.shareClasses;
  const canPropose = issuers.length > 0 && shareClasses.length > 0;
  const pendingPayments = session.db.dividendPayments.filter((item) => item.status === "PENDING");

  const declarationColumns: DataTableColumn[] = [
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.dividendDeclarations.map((item) => item.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "perShare", header: tx(locale, "Par action", "Per share"), align: "right", sortable: true },
    { id: "currency", header: tx(locale, "Devise", "Currency") },
  ];

  const declarationRows: DataTableRow[] = session.db.dividendDeclarations.map((declaration) => {
    const perShare = formatMoney(declaration.perShareMinor, declaration.currencyCode, locale);
    return {
      id: declaration.id,
      searchValue: `${declaration.status} ${perShare} ${declaration.currencyCode}`,
      filterValues: { status: declaration.status },
      sortValues: {
        status: declaration.status,
        perShare: declaration.perShareMinor,
        currency: declaration.currencyCode,
      },
      cells: {
        status: <span className="font-semibold">{declaration.status}</span>,
        perShare: `${perShare} / ${tx(locale, "action", "share")}`,
        currency: declaration.currencyCode,
      },
      actions:
        declaration.status === "PROPOSED" ? (
          <form action={dividendApproveAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="declarationId" value={declaration.id} />
            <input
              name="password"
              type="password"
              required
              className="h-9 w-36 rounded-full border px-3 text-sm"
              placeholder={tx(locale, "Mot de passe", "Password")}
            />
            <SubmitButton size="sm" className="h-9">
              {tx(locale, "Approuver", "Approve")}
            </SubmitButton>
          </form>
        ) : null,
    };
  });

  const paymentColumns: DataTableColumn[] = [
    { id: "reference", header: tx(locale, "Référence", "Reference"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(pendingPayments.map((item) => item.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
  ];

  const paymentRows: DataTableRow[] = pendingPayments.map((payment) => ({
    id: payment.id,
    searchValue: `${payment.providerReference} ${payment.status}`,
    filterValues: { status: payment.status },
    sortValues: { reference: payment.providerReference, status: payment.status },
    cells: {
      reference: <span className="font-semibold">{payment.providerReference}</span>,
      status: payment.status,
    },
    actions: (
      <form action={dividendPayAction}>
        <input type="hidden" name="paymentId" value={payment.id} />
        <SubmitButton variant="link" size="inline">
          {tx(locale, "Marquer payé", "Mark paid")}
        </SubmitButton>
      </form>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{tx(locale, "Dividendes", "Dividends")}</h1>
        <ModalOpenLink
          href="/admin/dividends?modal=propose"
          className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
        >
          {tx(locale, "Proposer", "Propose")}
        </ModalOpenLink>
      </div>
      {!canPropose ? (
        <p className="rounded-2xl bg-lilac/60 px-4 py-3 text-sm">
          {tx(
            locale,
            "Créez un émetteur (avec classe d'actions) avant de proposer un dividende.",
            "Create an issuer (with a share class) before proposing a dividend.",
          )}{" "}
          <Link href="/admin/issuers?modal=new" className="font-semibold text-violet">
            {tx(locale, "Ajouter un émetteur", "Add an issuer")}
          </Link>
        </p>
      ) : null}

      <DataTable
        locale={locale}
        columns={declarationColumns}
        rows={declarationRows}
        emptyMessage={tx(locale, "Aucune déclaration.", "No declarations.")}
      />

      <h2 className="text-xl font-bold">{tx(locale, "Paiements en attente", "Pending payments")}</h2>
      <DataTable
        locale={locale}
        columns={paymentColumns}
        rows={paymentRows}
        emptyMessage={tx(locale, "Aucun paiement en attente.", "No pending payments.")}
      />

      <SearchParamModal
        param="modal"
        value="propose"
        title={tx(locale, "Proposer un dividende", "Propose a dividend")}
        size="lg"
      >
        <form action={dividendProposeAction} className="grid gap-2 md:grid-cols-2">
          {error ? <p className="text-sm text-danger md:col-span-2">{errorCopy[error]?.[locale] ?? error}</p> : null}
          <EntitySelect
            locale={locale}
            name="issuerId"
            options={issuers.map((issuer) => ({ value: issuer.id, label: issuer.legalName }))}
            emptyLabel={tx(locale, "Aucun émetteur", "No issuers")}
            chooseLabel={tx(locale, "Choisir l'émetteur", "Choose an issuer")}
          />
          <EntitySelect
            locale={locale}
            name="shareClassId"
            options={shareClasses.map((item) => ({
              value: item.id,
              label: `${item.className} (${session.db.issuers.find((issuer) => issuer.id === item.issuerId)?.legalName ?? item.issuerId})`,
            }))}
            emptyLabel={tx(locale, "Aucune classe d'actions", "No share classes")}
            chooseLabel={tx(locale, "Choisir la classe", "Choose a share class")}
          />
          <input
            name="perShare"
            required
            placeholder={tx(locale, "Montant par action USD", "Amount per share USD")}
            className="h-11 rounded-2xl border px-3"
          />
          <input name="withholdingBps" required placeholder="1000" defaultValue="1000" className="h-11 rounded-2xl border px-3" />
          <label className="block text-sm font-semibold">
            {tx(locale, "Date d'arrêté", "Record date")}
            <DatePicker
              locale={locale}
              name="recordDate"
              required
              label={tx(locale, "Date d'arrêté", "Record date")}
              className="mt-1 h-11 rounded-2xl border px-3"
            />
          </label>
          <label className="block text-sm font-semibold">
            {tx(locale, "Date de paiement", "Payment date")}
            <DatePicker
              locale={locale}
              name="paymentDate"
              required
              label={tx(locale, "Date de paiement", "Payment date")}
              className="mt-1 h-11 rounded-2xl border px-3"
            />
          </label>
          <SubmitButton size="sm" disabled={!canPropose} className="md:col-span-2">
            {tx(locale, "Proposer", "Propose")}
          </SubmitButton>
        </form>
      </SearchParamModal>
    </div>
  );
}
