import { issuerScope } from "@/server/issuer-scope";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerProjects() {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  const projects = scope.session.db.projects.filter((item) => scope.issuerIds.has(item.issuerId));
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Projets", "Projects")}</h1>
      {projects.map((project) => (
        <article key={project.id} className="rounded-[24px] bg-white p-4">
          <p className="font-bold">{tx(locale, project.titleFr, project.titleEn)}</p>
          <p className="text-sm text-muted">{project.status}</p>
        </article>
      ))}
    </div>
  );
}
