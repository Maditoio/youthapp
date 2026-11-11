import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function OfferingsAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold">{tx(locale, "Offres", "Offerings")}</h1>
        <p className="mt-1 text-sm text-muted">
          {tx(
            locale,
            "Les transitions de statut restent ici. Le contenu riche s'édite sur la fiche projet.",
            "Status transitions stay here. Rich content is edited on the project page.",
          )}
        </p>
      </div>
      {session.db.offerings.map((offering) => {
        const project = session.db.projects.find((item) => item.id === offering.projectId);
        return (
          <article key={offering.id} className="rounded-[24px] bg-white p-4">
            <p className="font-bold">{tx(locale, offering.nameFr, offering.nameEn)}</p>
            <p className="text-sm text-muted">{offering.status}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <Link className="font-semibold text-violet" href={`/admin/offerings/${offering.id}`}>
                {tx(locale, "Transitions", "Transitions")}
              </Link>
              {project ? (
                <Link className="font-semibold text-violet" href={`/admin/projects/${project.id}`}>
                  {tx(locale, "Éditer le contenu du projet", "Edit project content")}
                </Link>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
