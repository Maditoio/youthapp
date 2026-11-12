import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { issuerScope } from "@/server/issuer-scope";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerDocuments() {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  const docs = scope.session.db.offeringDocuments.filter((doc) => {
    const offering = scope.session.db.offerings.find((item) => item.id === doc.offeringId);
    return offering && scope.issuerIds.has(offering.issuerId);
  });

  const columns: DataTableColumn[] = [
    { id: "title", header: tx(locale, "Document", "Document"), sortable: true },
  ];

  const rows: DataTableRow[] = docs.map((doc) => {
    const title = tx(locale, doc.titleFr, doc.titleEn);
    return {
      id: doc.id,
      searchValue: title,
      sortValues: { title },
      cells: {
        title: (
          <a href={`/api/documents/${doc.id}`} className="font-semibold text-violet">
            {title}
          </a>
        ),
      },
      actions: (
        <a href={`/api/documents/${doc.id}`} className="text-sm font-semibold text-violet">
          {tx(locale, "Ouvrir", "Open")}
        </a>
      ),
    };
  });

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Documents publiés", "Published documents")}</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucun document.", "No documents.")}
      />
    </div>
  );
}
