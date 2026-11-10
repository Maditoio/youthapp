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
      <h1 className="text-3xl font-bold">{tx(locale, "Offres", "Offerings")}</h1>
      {session.db.offerings.map((offering) => (
        <Link key={offering.id} href={`/admin/offerings/${offering.id}`} className="block rounded-[24px] bg-white p-4">
          {tx(locale, offering.nameFr, offering.nameEn)} · {offering.status}
        </Link>
      ))}
    </div>
  );
}
