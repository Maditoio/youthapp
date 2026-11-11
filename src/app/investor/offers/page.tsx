import Link from "next/link";
import { redirect } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { publicProjects } from "@/server/view";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const projects = publicProjects(session.db);
  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Offres ouvertes", "Open offerings")}</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {projects.map(({ project, offering }) =>
          offering ? (
            <Link key={offering.id} href={`/investor/offers/${offering.id}`} className="block rounded-[28px] bg-white p-5 transition-shadow hover:shadow-[var(--shadow-card)]">
              <p className="font-bold">{tx(locale, project.titleFr, project.titleEn)}</p>
              <p className="text-sm text-muted">
                {tx(locale, "Minimum", "Minimum")} {formatMoney(offering.minimumSubscriptionMinor, offering.currencyCode, locale)}
              </p>
            </Link>
          ) : null,
        )}
      </div>
    </div>
  );
}
