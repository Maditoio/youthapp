import { redirect } from "next/navigation";
import { deleteKinAction, kinAction } from "@/server/actions";
import { GenderSelect } from "@/components/choice-fields";
import { ModalOpenLink, SearchParamModal, SearchParamValueModal } from "@/components/search-param-modal";
import { genderLabel, readGender } from "@/lib/choices";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { errorCopy } from "@/server/domain/errors";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; modal?: string; edit?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  const people = session.db.nextOfKin.filter((item) => item.investorProfileId === profile?.id);
  const error = (await searchParams).error;
  const field = "h-12 w-full rounded-2xl border px-3";
  return (
    <div className="space-y-4 px-4 md:px-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{tx(locale, "Proches à prévenir", "Next of kin")}</h1>
          <p className="text-sm text-muted">
            {tx(locale, "Un proche n'hérite pas automatiquement.", "A contact does not inherit automatically.")}
          </p>
        </div>
        <ModalOpenLink
          href="/investor/profile/contacts?modal=new"
          className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
        >
          {tx(locale, "Ajouter", "Add")}
        </ModalOpenLink>
      </div>
      {people.map((person) => (
        <article key={person.id} className="rounded-[28px] bg-white p-4 text-sm">
          <p className="font-bold">{person.fullName}</p>
          <p className="text-muted">
            {person.relationship}
            {readGender(person.gender) ? ` · ${genderLabel(locale, readGender(person.gender)!)}` : ""}
          </p>
          <p className="text-muted">
            {person.email} · {person.phone}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <ModalOpenLink
              href={`/investor/profile/contacts?edit=${encodeURIComponent(person.id)}`}
              className="text-sm font-semibold text-violet underline-offset-2 hover:underline"
            >
              {tx(locale, "Modifier", "Edit")}
            </ModalOpenLink>
            <form action={deleteKinAction}>
              <input type="hidden" name="id" value={person.id} />
              <SubmitButton variant="danger" size="inline">
                {tx(locale, "Retirer", "Remove")}
              </SubmitButton>
            </form>
          </div>
        </article>
      ))}
      {people.length === 0 ? (
        <p className="text-sm text-muted">{tx(locale, "Aucun proche enregistré.", "No contacts saved.")}</p>
      ) : null}

      <SearchParamModal title={tx(locale, "Ajouter un proche", "Add a contact")} size="lg">
        <form action={kinAction} className="grid gap-2 md:grid-cols-2">
          {error ? <p className="text-sm text-danger md:col-span-2">{errorCopy[error]?.[locale] ?? error}</p> : null}
          <input name="fullName" placeholder={tx(locale, "Nom complet", "Full name")} className={field} />
          <input name="relationship" placeholder={tx(locale, "Lien", "Relationship")} className={field} />
          <GenderSelect locale={locale} required />
          <input name="email" placeholder="email" className={field} />
          <input name="phone" placeholder="+243..." className={field} />
          <SubmitButton size="sm" className="md:col-span-2">
            {tx(locale, "Ajouter", "Add")}
          </SubmitButton>
        </form>
      </SearchParamModal>

      <SearchParamValueModal
        param="edit"
        clearKeys={["error", "modal"]}
        size="lg"
        titleFor={() => tx(locale, "Modifier le proche", "Edit contact")}
      >
        {(id) => {
          const person = people.find((item) => item.id === id);
          if (!person) {
            return <p className="text-sm text-muted">{tx(locale, "Contact introuvable.", "Contact not found.")}</p>;
          }
          return (
            <form action={kinAction} className="grid gap-2 md:grid-cols-2">
              {error ? <p className="text-sm text-danger md:col-span-2">{errorCopy[error]?.[locale] ?? error}</p> : null}
              <input type="hidden" name="id" value={person.id} />
              <input name="fullName" defaultValue={person.fullName} className={field} />
              <input name="relationship" defaultValue={person.relationship} className={field} />
              <GenderSelect locale={locale} defaultValue={readGender(person.gender) ?? ""} required />
              <input name="email" defaultValue={person.email} className={field} />
              <input name="phone" defaultValue={person.phone} className={field} />
              <SubmitButton name="intent" value="update" size="sm" className="md:col-span-2">
                {tx(locale, "Mettre à jour", "Update")}
              </SubmitButton>
            </form>
          );
        }}
      </SearchParamValueModal>
    </div>
  );
}
