import { ProsePage } from "@/components/prose-page";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export default async function RisksPage() {
  const locale = await getLocale();
  return (
    <ProsePage locale={locale} returnTo="/risks" title={tx(locale, "Risques", "Risks")}>
      <p>{tx(locale, "Une entreprise peut échouer. Vous pouvez perdre tout l'argent engagé.", "A business can fail. You can lose all the money you commit.")}</p>
      <p>{tx(locale, "Les actions privées peuvent être impossibles à vendre. Cette application n'offre ni marché secondaire, ni rachat, ni retrait comme un compte bancaire.", "Private shares may be impossible to sell. This application offers no secondary market, no buyback, and no withdrawal like a bank account.")}</p>
      <p>{tx(locale, "Les changes, la politique, la réglementation et l'exécution du projet peuvent tous évoluer. Aucune autorité n'a approuvé cette démonstration.", "Currency, politics, regulation and project execution can all change. No authority has approved this demonstration.")}</p>
    </ProsePage>
  );
}
