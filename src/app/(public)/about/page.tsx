import { ProsePage } from "@/components/prose-page";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export default async function AboutPage() {
  const locale = await getLocale();
  return (
    <ProsePage locale={locale} returnTo="/about" title={tx(locale, "Le mouvement", "The movement")}>
      <p>{tx(locale, "Jeunese existe pour que des Congolaises et des Congolais, ici et dans la diaspora, puissent financer et posséder des entreprises productives. La plateforme n'est pas l'entreprise dans laquelle on investit.", "Jeunese exists so Congolese people, at home and in the diaspora, can finance and own productive businesses. The platform is not the company being invested in.")}</p>
      <p>{tx(locale, "Chaque émetteur est une société distincte. Une action de l'une ne donne aucun droit sur une autre, ni sur la plateforme.", "Each issuer is a separate company. A share in one gives no right in another, or in the platform.")}</p>
    </ProsePage>
  );
}
