import { VerifyForm } from "@/components/auth-forms";
import { resendCodeAction, currentDemoCode } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const locale = await getLocale();
  const email = (await searchParams).email ?? "";
  const demoCode = email ? await currentDemoCode(email) : null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{tx(locale, "Vérifier l'e-mail", "Verify email")}</h1>
      <VerifyForm locale={locale} email={email} demoCode={demoCode} />
      <form action={resendCodeAction}>
        <input type="hidden" name="email" value={email} />
        <button className="text-sm font-semibold text-violet">{tx(locale, "Renvoyer le code", "Resend code")}</button>
      </form>
    </div>
  );
}
