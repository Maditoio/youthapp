import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function ProjectsAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{tx(locale, "Projets", "Projects")}</h1>
        <Link href="/admin/projects/new" className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white">{tx(locale, "Nouveau", "New")}</Link>
      </div>
      {session.db.projects.map((project) => (
        <Link key={project.id} href={`/admin/projects/${project.id}`} className="block rounded-[24px] bg-white p-4">
          <p className="font-bold">{tx(locale, project.titleFr, project.titleEn)}</p>
          <p className="text-sm text-muted">{project.status}</p>
        </Link>
      ))}
    </div>
  );
}
