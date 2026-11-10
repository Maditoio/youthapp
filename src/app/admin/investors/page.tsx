import Link from "next/link";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { maskValue } from "@/lib/format";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function InvestorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const q = ((await searchParams).q ?? "").toLowerCase();
  const rows = session.db.investorProfiles.filter((profile) => {
    const user = session.db.users.find((item) => item.id === profile.userId);
    const hay = `${profile.legalFirstName} ${profile.legalLastName} ${profile.investorNumber} ${user?.email} ${user?.phone}`.toLowerCase();
    return !q || hay.includes(q);
  });
  return (
    <div>
      <h1 className="text-3xl font-bold">{tx(locale, "Investisseurs", "Investors")}</h1>
      <form className="my-3">
        <input name="q" defaultValue={q} placeholder={tx(locale, "Nom, numéro, e-mail, téléphone", "Name, number, email, phone")} className="h-12 w-full max-w-md rounded-full border bg-white px-4" />
      </form>
      <div className="overflow-x-auto rounded-[24px] bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="p-3">{tx(locale, "Numéro", "Number")}</th>
              <th className="p-3">{tx(locale, "Nom", "Name")}</th>
              <th className="p-3">{tx(locale, "Pays", "Country")}</th>
              <th className="p-3">KYC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((profile) => (
              <tr key={profile.id} className="border-t border-border">
                <td className="p-3"><Link className="font-semibold text-violet" href={`/admin/investors/${profile.id}`}>{profile.investorNumber}</Link></td>
                <td className="p-3">{profile.legalFirstName} {profile.legalLastName}</td>
                <td className="p-3">{profile.countryOfResidence}</td>
                <td className="p-3">{profile.onboardingStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{tx(locale, "Téléphone masqué dans le détail.", "Phone is masked on the detail page.")} {maskValue("0000")}</p>
    </div>
  );
}
