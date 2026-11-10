import { issuerScope } from "@/server/issuer-scope";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerReports() {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Rapports", "Reports")}</h1>
      <p className="text-sm text-muted">{tx(locale, "Les comptes de gestion se déposent ici pour relecture. Ils ne deviennent pas publics tout seuls, et ils ne déclarent pas un dividende.", "Management accounts are lodged here for review. They do not become public on their own, and they do not declare a dividend.")}</p>
      <form className="space-y-2 rounded-[24px] bg-white p-4" action="/issuer/updates">
        <p className="text-sm">{tx(locale, "Utilisez les actualités pour joindre un commentaire de rapport. Le dépôt binaire privé n'est pas exposé par une URL publique.", "Use updates to attach a report comment. Private binary files are not exposed through a public URL.")}</p>
      </form>
    </div>
  );
}
