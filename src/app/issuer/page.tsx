import { issuerScope } from "@/server/issuer-scope";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerHome() {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  const issuers = scope.session.db.issuers.filter((item) => scope.issuerIds.has(item.id));
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Votre société", "Your company")}</h1>
      {issuers.map((issuer) => (
        <article key={issuer.id} className="rounded-[28px] bg-white p-5 text-sm">
          <p className="text-xl font-bold">{issuer.legalName}</p>
          <p>{issuer.registrationNumber}</p>
          <p>{issuer.registeredAddress}</p>
          <p>{issuer.industry}</p>
        </article>
      ))}
    </div>
  );
}
