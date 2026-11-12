import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function VotesAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();

  const columns: DataTableColumn[] = [
    { id: "title", header: tx(locale, "Titre", "Title"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.resolutions.map((resolution) => resolution.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "votes", header: tx(locale, "Voix", "Votes"), align: "right", sortable: true },
    { id: "breakdown", header: tx(locale, "Détail", "Breakdown"), hideOnMobile: true },
  ];

  const rows: DataTableRow[] = session.db.resolutions.map((resolution) => {
    const votes = session.db.votes.filter((item) => item.resolutionId === resolution.id);
    const total = votes.reduce((sum, vote) => sum + vote.votesCast, 0);
    const title = tx(locale, resolution.titleFr, resolution.titleEn);
    const breakdown =
      votes.length > 0
        ? votes.map((vote) => `${vote.voteChoice} · ${vote.votesCast}`).join(" · ")
        : tx(locale, "Aucune voix", "No votes");
    return {
      id: resolution.id,
      searchValue: `${title} ${resolution.status} ${total} ${breakdown}`,
      filterValues: { status: resolution.status },
      sortValues: {
        title,
        status: resolution.status,
        votes: total,
        breakdown,
      },
      cells: {
        title: <span className="font-semibold">{title}</span>,
        status: resolution.status,
        votes: total,
        breakdown: <span className="text-muted">{breakdown}</span>,
      },
    };
  });

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Résolutions", "Resolutions")}</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucune résolution.", "No resolutions.")}
      />
    </div>
  );
}
