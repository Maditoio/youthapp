import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuersPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Émetteurs", "Issuers")}</h1>
      {session.db.issuers.map((issuer) => (
        <article key={issuer.id} className="rounded-[24px] bg-white p-4 text-sm">
          <p className="font-bold">{issuer.legalName}</p>
          <p>{issuer.registrationNumber} · {issuer.jurisdiction} · {issuer.companyStatus}</p>
          <p>{issuer.registeredAddress}</p>
        </article>
      ))}
    </div>
  );
}
