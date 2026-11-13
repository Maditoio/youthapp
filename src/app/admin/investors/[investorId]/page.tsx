import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { genderLabel, readGender } from "@/lib/choices";
import { formatDate, formatMoney, maskValue } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { getStore } from "@/server/db/store";
import { ensureShareCertificates } from "@/server/domain/certificates";
import { holdingQuantity } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function InvestorDetail({ params }: { params: Promise<{ investorId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const { investorId } = await params;
  const store = await getStore();
  await store.update((db) => ensureShareCertificates(db, investorId));
  const db = store.db;
  const profile = db.investorProfiles.find((item) => item.id === investorId);
  if (!profile) notFound();
  const user = db.users.find((item) => item.id === profile.userId);
  const subs = db.subscriptions.filter((item) => item.investorProfileId === profile.id);
  const certificates = db.shareCertificates.filter(
    (item) => item.investorProfileId === profile.id && item.status === "ACTIVE",
  );
  const holdings = db.shareClasses
    .map((shareClass) => {
      const quantity = holdingQuantity(db, profile.id, shareClass.issuerId, shareClass.id);
      if (!quantity) return null;
      const issuer = db.issuers.find((item) => item.id === shareClass.issuerId);
      return { shareClass, quantity, issuer };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const subColumns: DataTableColumn[] = [
    { id: "reference", header: tx(locale, "Référence", "Reference"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(subs.map((item) => item.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "shares", header: tx(locale, "Actions", "Shares"), align: "right", sortable: true },
    { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
  ];

  const subRows: DataTableRow[] = subs.map((sub) => {
    const amount = formatMoney(sub.totalMinor, sub.currencyCode, locale);
    return {
      id: sub.id,
      searchValue: `${sub.reference} ${sub.status} ${sub.shareQuantity} ${amount}`,
      filterValues: { status: sub.status },
      sortValues: {
        reference: sub.reference,
        status: sub.status,
        shares: sub.shareQuantity,
        amount: sub.totalMinor,
      },
      cells: {
        reference: <span className="font-semibold">{sub.reference}</span>,
        status: sub.status,
        shares: sub.shareQuantity,
        amount,
      },
    };
  });

  const holdingColumns: DataTableColumn[] = [
    { id: "class", header: tx(locale, "Classe", "Class"), sortable: true },
    { id: "issuer", header: tx(locale, "Émetteur", "Issuer"), sortable: true },
    { id: "quantity", header: tx(locale, "Quantité", "Quantity"), align: "right", sortable: true },
  ];

  const holdingRows: DataTableRow[] = holdings.map(({ shareClass, quantity, issuer }) => ({
    id: shareClass.id,
    searchValue: `${shareClass.className} ${issuer?.legalName ?? ""} ${quantity}`,
    sortValues: {
      class: shareClass.className,
      issuer: issuer?.legalName ?? "",
      quantity,
    },
    cells: {
      class: <span className="font-semibold">{shareClass.className}</span>,
      issuer: issuer?.legalName ?? "—",
      quantity,
    },
  }));

  const certColumns: DataTableColumn[] = [
    { id: "number", header: tx(locale, "Numéro", "Number"), sortable: true },
    { id: "shares", header: tx(locale, "Actions", "Shares"), align: "right", sortable: true },
    { id: "date", header: tx(locale, "Date", "Date"), sortable: true },
    { id: "register", header: tx(locale, "Registre", "Register"), sortable: true, hideOnMobile: true },
  ];

  const certRows: DataTableRow[] = certificates.map((cert) => ({
    id: cert.id,
    searchValue: `${cert.certificateNumber} ${cert.shareQuantity} ${cert.registerReference ?? ""}`,
    sortValues: {
      number: cert.certificateNumber,
      shares: cert.shareQuantity,
      date: cert.allotmentDate,
      register: cert.registerReference ?? "",
    },
    cells: {
      number: (
        <Link
          href={`/verify/certificate/${cert.id}?s=${encodeURIComponent(cert.signature)}`}
          className="font-semibold text-link"
        >
          {cert.certificateNumber}
        </Link>
      ),
      shares: cert.shareQuantity,
      date: formatDate(cert.allotmentDate, locale),
      register: cert.registerReference ?? "—",
    },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {profile.legalFirstName} {profile.legalLastName}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {profile.investorNumber} · {profile.onboardingStatus} · {profile.countryOfResidence}
        </p>
        <p className="text-sm">
          {tx(locale, "Genre", "Gender")}:{" "}
          {readGender(profile.gender)
            ? genderLabel(locale, readGender(profile.gender)!)
            : tx(locale, "Non renseigné", "Not provided")}
        </p>
        <p className="text-sm">
          {user?.email} · {maskValue(user?.phone)}
        </p>
        <p className="text-sm">
          {tx(locale, "Identifiant fiscal", "Tax id")} {maskValue(profile.taxId)}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{tx(locale, "Souscriptions", "Subscriptions")}</h2>
        <DataTable
          locale={locale}
          columns={subColumns}
          rows={subRows}
          emptyMessage={tx(locale, "Aucune souscription.", "No subscriptions.")}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{tx(locale, "Actions", "Shares")}</h2>
        <DataTable
          locale={locale}
          columns={holdingColumns}
          rows={holdingRows}
          emptyMessage={tx(locale, "Aucune détention.", "No holdings.")}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{tx(locale, "Titres", "Certificates")}</h2>
        <DataTable
          locale={locale}
          columns={certColumns}
          rows={certRows}
          emptyMessage={tx(locale, "Aucun certificat.", "No certificates.")}
        />
      </section>
    </div>
  );
}
