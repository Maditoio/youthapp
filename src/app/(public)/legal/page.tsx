import { ProsePage } from "@/components/prose-page";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export default async function LegalPage() {
  const locale = await getLocale();
  return (
    <ProsePage locale={locale} returnTo="/legal" title={tx(locale, "Mentions", "Legal")}>
      <p>{tx(locale, "Nom de travail : Jeunese. Aucune société exploitante n'est déclarée ici. Aucun agrément de la RDC ou d'un autre pays n'est affirmé.", "Working name: Jeunese. No operating company is stated here. No DRC or foreign authorisation is claimed.")}</p>
      <p>{tx(locale, "Les documents affichés sont des textes de démonstration dans leur langue d'origine. Ils ne sont pas une traduction juridique revue.", "The documents shown are demonstration texts in their source language. They are not a reviewed legal translation.")}</p>
      <p>{tx(locale, "Les données de cette démo restent sur cette machine. Les pièces d'identité ne sont pas servies par une adresse publique devinable.", "This demo's data stays on this machine. Identity documents are not served from a guessable public address.")}</p>
    </ProsePage>
  );
}
