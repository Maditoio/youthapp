import { issuerScope } from "@/server/issuer-scope";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { issuedQuantity } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function IssuerComms() {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  const classes = scope.session.db.shareClasses.filter((item) => scope.issuerIds.has(item.issuerId));
  return (
    <div className="space-y-3 text-sm">
      <h1 className="text-3xl font-bold">{tx(locale, "Communications", "Communications")}</h1>
      <p className="text-muted">{tx(locale, "Les noms des investisseurs et leurs pièces d'identité ne sont pas visibles ici.", "Investor names and identity documents are not visible here.")}</p>
      {classes.map((shareClass) => (
        <p key={shareClass.id}>{shareClass.className}: {issuedQuantity(scope.session.db, shareClass.issuerId, shareClass.id)} {tx(locale, "actions inscrites", "shares recorded")}</p>
      ))}
    </div>
  );
}
