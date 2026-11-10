import { ProsePage } from "@/components/prose-page";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export default async function HowPage() {
  const locale = await getLocale();
  return (
    <ProsePage locale={locale} returnTo="/how-it-works" title={tx(locale, "Comment la propriété se forme", "How ownership is formed")}>
      <p>{tx(locale, "Vous choisissez une offre approuvée, pas un solde commun.", "You choose an approved offering, not a pooled balance.")}</p>
      <p>{tx(locale, "Le serveur calcule le nombre d'actions à partir du prix d'émission. Un reste n'est pas écarté : le montant doit tomber juste.", "The server calculates the share quantity from the issue price. A remainder is not discarded: the amount must divide exactly.")}</p>
      <p>{tx(locale, "Le paiement confirme la souscription. Une autre personne approuve ensuite l'émission. C'est cette écriture qui crée la détention sur le registre de démonstration.", "Payment confirms the subscription. Someone else then approves issuance. That entry creates the holding on the demonstration register.")}</p>
      <p>{tx(locale, "Il n'y a pas de revente en un clic, ni de dividende promis.", "There is no one-click sale, and no promised dividend.")}</p>
    </ProsePage>
  );
}
