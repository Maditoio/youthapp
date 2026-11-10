import { notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function ProjectAdminDetail({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const { projectId } = await params;
  const project = session.db.projects.find((item) => item.id === projectId);
  if (!project) notFound();
  const offering = session.db.offerings.find((item) => item.projectId === project.id);
  return (
    <div className="space-y-2 text-sm">
      <h1 className="text-3xl font-bold">{tx(locale, project.titleFr, project.titleEn)}</h1>
      <p>{project.status} · {project.locationName}</p>
      {offering ? <p>{tx(locale, "Offre", "Offering")} {offering.status} · <a className="text-violet" href={`/admin/offerings/${offering.id}`}>{offering.id}</a></p> : null}
    </div>
  );
}
