import { MfaForm } from "@/components/auth-forms";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export default async function MfaPage() {
  const locale = await getLocale();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{tx(locale, "Vérification du personnel", "Staff verification")}</h1>
      <MfaForm locale={locale} />
    </div>
  );
}
