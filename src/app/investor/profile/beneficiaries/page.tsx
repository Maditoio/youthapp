import { redirect } from "next/navigation";
import { CountrySelect } from "@/components/choice-fields";
import { NominationForm } from "@/components/profile-forms";
import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { genderLabel, readGender } from "@/lib/choices";
import { deathReportAction } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function BeneficiariesPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  const sets = session.db.nominationSets.filter((item) => item.investorProfileId === profile?.id);
  return (
    <div className="space-y-4 px-4 md:px-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{tx(locale, "Bénéficiaires", "Beneficiaries")}</h1>
          <p className="max-w-3xl text-sm text-muted">
            {tx(
              locale,
              "La portée de cette démo est une déclaration pour l'ensemble des titres, pas un droit par société. Elle ne transfère rien.",
              "This demo's scope is a statement for all holdings, not a per-company right. It transfers nothing.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModalOpenLink
            href="/investor/profile/beneficiaries?modal=nominate"
            className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
          >
            {tx(locale, "Nomination", "Nomination")}
          </ModalOpenLink>
          <ModalOpenLink
            href="/investor/profile/beneficiaries?modal=death"
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold"
          >
            {tx(locale, "Signaler un décès", "Report a death")}
          </ModalOpenLink>
        </div>
      </div>
      {sets.map((set) => (
        <article key={set.id} className="rounded-[28px] bg-white p-4 text-sm">
          <p className="font-semibold">
            v{set.version} · {set.status} · {set.totalBps / 100}%
          </p>
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
      {sets.length === 0 ? (
        <p className="text-sm text-muted">{tx(locale, "Aucune nomination enregistrée.", "No nominations saved.")}</p>
      ) : null}

      <SearchParamModal
        param="modal"
        value="nominate"
        title={tx(locale, "Enregistrer une nomination", "Save a nomination")}
        size="xl"
      >
        <NominationForm locale={locale} />
      </SearchParamModal>

      <SearchParamModal
        param="modal"
        value="death"
        title={tx(locale, "Signaler un décès", "Report a death")}
        description={tx(
          locale,
          "Le signalement n'est pas une preuve et ne déplace aucune action.",
          "The report is not proof and does not move any shares.",
        )}
      >
        <form action={deathReportAction} className="space-y-2">
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
          <SubmitButton variant="ink" size="sm">
            {tx(locale, "Ouvrir un dossier", "Open a case")}
          </SubmitButton>
        </form>
      </SearchParamModal>
    </div>
  );
}
