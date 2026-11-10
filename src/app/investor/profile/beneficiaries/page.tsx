import { redirect } from "next/navigation";
import { CountrySelect } from "@/components/choice-fields";
import { NominationForm } from "@/components/profile-forms";
import { genderLabel, readGender } from "@/lib/choices";
import { deathReportAction } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function BeneficiariesPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  const sets = session.db.nominationSets.filter((item) => item.investorProfileId === profile?.id);
  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Bénéficiaires", "Beneficiaries")}</h1>
      <p className="text-sm text-muted">
        {tx(locale, "La portée de cette démo est une déclaration pour l'ensemble des titres, pas un droit par société. Elle ne transfère rien.", "This demo's scope is a statement for all holdings, not a per-company right. It transfers nothing.")}
      </p>
      {sets.map((set) => (
        <article key={set.id} className="rounded-[28px] bg-white p-4 text-sm">
          <p className="font-semibold">v{set.version} · {set.status} · {set.totalBps / 100}%</p>
          <ul>
            {session.db.allocations
              .filter((item) => item.nominationSetId === set.id)
              .map((item) => (
                <li key={item.id}>
                  {item.fullName} · {item.relationship}
                  {readGender(item.gender) ? ` · ${genderLabel(locale, readGender(item.gender)!)}` : ""}
                  {" · "}
                  {item.allocationBps / 100}%
                </li>
              ))}
          </ul>
        </article>
      ))}
      <NominationForm locale={locale} />
      <form action={deathReportAction} className="space-y-2 rounded-[28px] bg-white p-4">
        <h2 className="font-bold">{tx(locale, "Signaler un décès", "Report a death")}</h2>
        <p className="text-sm text-muted">{tx(locale, "Le signalement n'est pas une preuve et ne déplace aucune action.", "The report is not proof and does not move any shares.")}</p>
        <label className="block text-sm font-semibold">
          {tx(locale, "Pays", "Country")}
          <CountrySelect
            locale={locale}
            name="jurisdiction"
            defaultValue={profile?.countryOfResidence ?? "CD"}
            required
            className="mt-1"
          />
        </label>
        <textarea name="notes" className="min-h-24 w-full rounded-2xl border px-3 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">{tx(locale, "Ouvrir un dossier", "Open a case")}</button>
      </form>
    </div>
  );
}
