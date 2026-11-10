import { issuerScope } from "@/server/issuer-scope";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerDocuments() {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  const docs = scope.session.db.offeringDocuments.filter((doc) => {
    const offering = scope.session.db.offerings.find((item) => item.id === doc.offeringId);
    return offering && scope.issuerIds.has(offering.issuerId);
  });
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold">{tx(locale, "Documents publiés", "Published documents")}</h1>
      {docs.map((doc) => (
        <a key={doc.id} className="block rounded-2xl bg-white p-3 text-violet" href={`/api/documents/${doc.id}`}>{tx(locale, doc.titleFr, doc.titleEn)}</a>
      ))}
    </div>
  );
}
