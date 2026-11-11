import { issuerUpdateAction } from "@/server/actions";
import { EntitySelect } from "@/components/choice-fields";
import { issuerScope } from "@/server/issuer-scope";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerUpdates() {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  const projects = scope.session.db.projects.filter((item) => scope.issuerIds.has(item.issuerId));
  const updates = scope.session.db.projectUpdates.filter((item) => projects.some((project) => project.id === item.projectId));
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Actualités", "Updates")}</h1>
      {updates.map((item) => (
        <p key={item.id} className="rounded-2xl bg-white p-3 text-sm">
          {tx(locale, item.titleFr, item.titleEn)} · {item.approvalStatus}
        </p>
      ))}
      <form action={issuerUpdateAction} className="space-y-2 rounded-[24px] bg-white p-4">
        {projects.length === 0 ? (
          <p className="text-sm text-muted">
            {tx(
              locale,
              "Aucun projet n'est lié à votre société. Demandez à la plateforme d'en créer un.",
              "No project is linked to your company yet. Ask the platform to create one.",
            )}
          </p>
        ) : null}
        <EntitySelect
          locale={locale}
          name="projectId"
          options={projects.map((project) => ({
            value: project.id,
            label: tx(locale, project.titleFr, project.titleEn),
          }))}
          emptyLabel={tx(locale, "Aucun projet disponible", "No projects available")}
          chooseLabel={tx(locale, "Choisir un projet", "Choose a project")}
        />
        <input name="titleFr" required placeholder="Titre" className="h-12 w-full rounded-2xl border px-3" />
        <input name="titleEn" required placeholder="Title" className="h-12 w-full rounded-2xl border px-3" />
        <textarea name="bodyFr" required className="min-h-20 w-full rounded-2xl border px-3 py-2" />
        <textarea name="bodyEn" required className="min-h-20 w-full rounded-2xl border px-3 py-2" />
        <button className="rounded-full bg-violet px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={projects.length === 0}>
          {tx(locale, "Soumettre à relecture", "Submit for review")}
        </button>
      </form>
    </div>
  );
}
