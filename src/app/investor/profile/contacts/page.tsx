import { redirect } from "next/navigation";
import { deleteKinAction, kinAction } from "@/server/actions";
import { GenderSelect } from "@/components/choice-fields";
import { readGender } from "@/lib/choices";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { errorCopy } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  const people = session.db.nextOfKin.filter((item) => item.investorProfileId === profile?.id);
  const error = (await searchParams).error;
  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Proches à prévenir", "Next of kin")}</h1>
      <p className="text-sm text-muted">{tx(locale, "Un proche n'hérite pas automatiquement.", "A contact does not inherit automatically.")}</p>
      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
      {people.map((person) => (
        <form key={person.id} action={kinAction} className="grid gap-2 rounded-[28px] bg-white p-4 md:grid-cols-2 xl:grid-cols-3">
          <input type="hidden" name="id" value={person.id} />
          <input name="fullName" defaultValue={person.fullName} className="h-12 rounded-2xl border px-3" />
          <input name="relationship" defaultValue={person.relationship} className="h-12 rounded-2xl border px-3" />
          <GenderSelect locale={locale} defaultValue={readGender(person.gender) ?? ""} required />
          <input name="email" defaultValue={person.email} className="h-12 rounded-2xl border px-3" />
          <input name="phone" defaultValue={person.phone} className="h-12 rounded-2xl border px-3" />
          <button className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white">{tx(locale, "Mettre à jour", "Update")}</button>
          <button formAction={deleteKinAction} className="text-sm font-semibold text-danger">{tx(locale, "Retirer", "Remove")}</button>
        </form>
      ))}
      <form action={kinAction} className="grid gap-2 rounded-[28px] bg-white p-4 md:grid-cols-2 xl:grid-cols-3">
        <input name="fullName" placeholder={tx(locale, "Nom complet", "Full name")} className="h-12 rounded-2xl border px-3" />
        <input name="relationship" placeholder={tx(locale, "Lien", "Relationship")} className="h-12 rounded-2xl border px-3" />
        <GenderSelect locale={locale} required />
        <input name="email" placeholder="email" className="h-12 rounded-2xl border px-3" />
        <input name="phone" placeholder="+243..." className="h-12 rounded-2xl border px-3" />
        <button className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white">{tx(locale, "Ajouter", "Add")}</button>
      </form>
    </div>
  );
}
