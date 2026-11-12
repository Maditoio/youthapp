import Link from "next/link";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { maskValue } from "@/lib/format";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function InvestorsPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();

  const columns: DataTableColumn[] = [
    { id: "number", header: tx(locale, "Numéro", "Number"), sortable: true },
    { id: "name", header: tx(locale, "Nom", "Name"), sortable: true },
    { id: "country", header: tx(locale, "Pays", "Country"), sortable: true },
    {
      id: "kyc",
      header: "KYC",
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.investorProfiles.map((profile) => profile.onboardingStatus)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
  ];

  const rows: DataTableRow[] = session.db.investorProfiles.map((profile) => {
    const user = session.db.users.find((item) => item.id === profile.userId);
    const name = `${profile.legalFirstName} ${profile.legalLastName}`;
    return {
      id: profile.id,
      searchValue: `${profile.investorNumber} ${name} ${profile.countryOfResidence} ${profile.onboardingStatus} ${user?.email ?? ""} ${user?.phone ?? ""}`,
      filterValues: { kyc: profile.onboardingStatus },
      sortValues: {
        number: profile.investorNumber,
        name,
        country: profile.countryOfResidence,
        kyc: profile.onboardingStatus,
      },
      cells: {
        number: (
          <Link className="font-semibold text-violet" href={`/admin/investors/${profile.id}`}>
            {profile.investorNumber}
          </Link>
        ),
        name,
        country: profile.countryOfResidence,
        kyc: profile.onboardingStatus,
      },
    };
  });

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Investisseurs", "Investors")}</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucun investisseur.", "No investors.")}
        labels={{
          searchPlaceholder: tx(locale, "Nom, numéro, e-mail, téléphone", "Name, number, email, phone"),
        }}
      />
      <p className="text-xs text-muted">
        {tx(locale, "Téléphone masqué dans le détail.", "Phone is masked on the detail page.")} {maskValue("0000")}
      </p>
    </div>
  );
}
