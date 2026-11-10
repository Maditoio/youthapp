import { resetDemoAction } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const locale = await getLocale();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Réglages", "Settings")}</h1>
      <p className="text-sm text-muted">{tx(locale, "La réinitialisation reconstruit uniquement les données fictives de cette machine.", "Reset rebuilds only the fictional data on this machine.")}</p>
      <form action={resetDemoAction}>
        <button className="rounded-full bg-violet px-4 py-2 font-semibold text-white">{tx(locale, "Réinitialiser la démonstration", "Reset demonstration")}</button>
      </form>
    </div>
  );
}
