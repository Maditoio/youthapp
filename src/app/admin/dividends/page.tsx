import { DatePicker } from "@/components/ui/date-picker";
import { dividendApproveAction, dividendPayAction, dividendProposeAction } from "@/server/actions";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { formatMoney } from "@/lib/format";
import { ids } from "@/server/db/seed";

export const dynamic = "force-dynamic";

export default async function DividendsAdmin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Dividendes", "Dividends")}</h1>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <form action={dividendProposeAction} className="grid gap-2 rounded-[24px] bg-white p-4 md:grid-cols-2">
        <input type="hidden" name="issuerId" value={ids.issuer} />
        <input type="hidden" name="shareClassId" value={ids.shareClass} />
        <input name="perShare" required placeholder={tx(locale, "Montant par action USD", "Amount per share USD")} className="h-11 rounded-2xl border px-3" />
        <input name="withholdingBps" required placeholder="1000" className="h-11 rounded-2xl border px-3" />
        <label className="block text-sm font-semibold">
          {tx(locale, "Date d'arrêté", "Record date")}
          <DatePicker
            locale={locale}
            name="recordDate"
            required
            label={tx(locale, "Date d'arrêté", "Record date")}
            className="mt-1 h-11 rounded-2xl border px-3"
          />
        </label>
        <label className="block text-sm font-semibold">
          {tx(locale, "Date de paiement", "Payment date")}
          <DatePicker
            locale={locale}
            name="paymentDate"
            required
            label={tx(locale, "Date de paiement", "Payment date")}
            className="mt-1 h-11 rounded-2xl border px-3"
          />
        </label>
        <button className="rounded-full bg-violet px-4 py-2 font-semibold text-white">{tx(locale, "Proposer", "Propose")}</button>
      </form>
      {session.db.dividendDeclarations.map((declaration) => (
        <article key={declaration.id} className="rounded-[24px] bg-white p-4 text-sm">
          <p className="font-bold">{declaration.status} · {formatMoney(declaration.perShareMinor, declaration.currencyCode, locale)} / {tx(locale, "action", "share")}</p>
          {declaration.status === "PROPOSED" ? (
            <form action={dividendApproveAction} className="mt-2 flex gap-2">
              <input type="hidden" name="declarationId" value={declaration.id} />
              <input name="password" type="password" required className="h-10 rounded-full border px-3" />
              <button className="rounded-full bg-violet px-3 text-white">{tx(locale, "Approuver", "Approve")}</button>
            </form>
          ) : null}
        </article>
      ))}
      {session.db.dividendPayments.filter((item) => item.status === "PENDING").map((payment) => (
        <form key={payment.id} action={dividendPayAction}>
          <input type="hidden" name="paymentId" value={payment.id} />
          <button className="text-sm font-semibold text-violet">{tx(locale, "Marquer payé", "Mark paid")} {payment.providerReference}</button>
        </form>
      ))}
    </div>
  );
}
