import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestedDocumentsPanel } from "@/components/kyc-status-card";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { kycReasonLabel, parseKycReviewNotes } from "@/lib/kyc-decisions";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  const kyc = session.db.kycCases.find((item) => item.investorProfileId === profile?.id);
  const docs = session.db.kycDocuments.filter((item) => item.kycCaseId === kyc?.id);
  const offeringDocs = session.db.offeringDocuments.filter((item) => item.visibility === "PUBLIC");
  const needsMore =
    profile?.onboardingStatus === "ADDITIONAL_INFORMATION_REQUIRED" ||
    kyc?.status === "ADDITIONAL_INFORMATION_REQUIRED";
  const parsed = parseKycReviewNotes(kyc?.reviewNotes);
  const reason = kycReasonLabel(locale, "ADDITIONAL_INFORMATION_REQUIRED", kyc?.reasonCode ?? null);

  const allRows: Array<{
    id: string;
    kind: string;
    title: string;
    status: string;
    href: string;
  }> = [
    ...offeringDocs.map((doc) => ({
      id: doc.id,
      kind: tx(locale, "Offre", "Offering"),
      title: tx(locale, doc.titleFr, doc.titleEn),
      status: "PUBLIC",
      href: `/api/documents/${doc.id}`,
    })),
    ...docs.map((doc) => ({
      id: doc.id,
      kind: tx(locale, "Identité", "Identity"),
      title: doc.documentType,
      status: doc.verificationStatus + (doc.rejectionReasonCode ? ` · ${doc.rejectionReasonCode}` : ""),
      href: `/api/documents/${doc.id}`,
    })),
  ];

  const columns: DataTableColumn[] = [
    { id: "title", header: tx(locale, "Document", "Document"), sortable: true },
    {
      id: "kind",
      header: tx(locale, "Type", "Type"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(allRows.map((row) => row.kind)),
        allLabel: tx(locale, "Tous les types", "All types"),
      },
    },
    { id: "status", header: tx(locale, "Statut", "Status"), sortable: true },
  ];

  const rows: DataTableRow[] = allRows.map((row) => ({
    id: row.id,
    searchValue: `${row.title} ${row.kind} ${row.status}`,
    filterValues: { kind: row.kind },
    sortValues: { title: row.title, kind: row.kind, status: row.status },
    cells: {
      title: (
        <a href={row.href} className="font-semibold text-violet">
          {row.title}
        </a>
      ),
      kind: row.kind,
      status: row.status,
    },
    actions: (
      <a href={row.href} className="text-sm font-semibold text-violet">
        {tx(locale, "Télécharger", "Download")}
      </a>
    ),
  }));

  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Documents", "Documents")}</h1>
      {needsMore ? <RequestedDocumentsPanel locale={locale} kyc={kyc} /> : null}
      {!needsMore && (kyc?.reasonCode || parsed.notes) ? (
        <p className="min-w-0 max-w-3xl break-words text-sm text-muted">
          {reason || kyc?.reasonCode || ""}
          {parsed.notes ? ` · ${parsed.notes}` : ""}
        </p>
      ) : null}
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucun document.", "No documents.")}
      />
      {kyc && kyc.status !== "APPROVED" && kyc.status !== "REJECTED" && kyc.status !== "SUSPENDED" ? (
        <Link href="/investor/onboarding" className="text-sm font-semibold text-violet">
          {needsMore
            ? tx(locale, "Déposer les documents demandés", "Upload requested documents")
            : tx(locale, "Ajouter une pièce", "Add a document")}
        </Link>
      ) : null}
    </div>
  );
}
