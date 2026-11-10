import { DatePicker } from "@/components/ui/date-picker";
import { issuerProfitAction } from "@/server/actions";
import { issuerScope } from "@/server/issuer-scope";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { errorCopy } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

export default async function IssuerProfits({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  const db = scope.session.db;
  const classes = db.shareClasses.filter((item) => scope.issuerIds.has(item.issuerId));
  const financed = db.companyFinancings.filter((item) => scope.issuerIds.has(item.issuerId));
  const financedMinor = financed.reduce((sum, item) => sum + item.amountMinor, 0);
  const declarations = db.dividendDeclarations.filter((item) => scope.issuerIds.has(item.issuerId));
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Bénéfices", "Profits")}</h1>
      <article className="rounded-[28px] bg-white p-5">
        <p className="text-sm text-muted">{tx(locale, "Fonds déjà affectés à la société", "Money already assigned to the company")}</p>
        <p className="text-3xl font-bold">{formatMoney(financedMinor, "USD", locale)}</p>
        <p className="mt-2 text-sm text-muted">
          {tx(
            locale,
            "Cet argent est libéré quand les actions sont émises. Il finance la société. Il ne part pas avant l'émission.",
            "This money is released when the shares are issued. It finances the company. It does not move before issuance.",
          )}
        </p>
      </article>
      <form action={issuerProfitAction} className="space-y-2 rounded-[28px] bg-white p-5">
        <h2 className="text-lg font-bold">{tx(locale, "Décider d'un versement", "Decide a profit payment")}</h2>
        <p className="text-sm text-muted">
          {tx(
            locale,
            "Le montant est multiplié par le nombre d'actions de chaque actionnaire à la date d'arrêté. Un autre administrateur doit encore approuver le versement.",
            "The amount is multiplied by each shareholder's number of shares on the record date. Another administrator must still approve the payment.",
          )}
        </p>
        {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
        <select name="issuerId" className="h-12 w-full rounded-2xl border px-3">
          {[...scope.issuerIds].map((id) => (
            <option key={id} value={id}>{db.issuers.find((item) => item.id === id)?.legalName ?? id}</option>
          ))}
        </select>
        <select name="shareClassId" className="h-12 w-full rounded-2xl border px-3">
          {classes.map((item) => (
            <option key={item.id} value={item.id}>{item.className}</option>
          ))}
        </select>
        <input name="perShare" required placeholder={tx(locale, "Montant par action USD", "Amount per share USD")} className="h-12 w-full rounded-2xl border px-3" />
        <input name="withholdingBps" required defaultValue="1000" placeholder="1000" className="h-12 w-full rounded-2xl border px-3" />
        <label className="block text-sm font-semibold">
          {tx(locale, "Date d'arrêté", "Record date")}
          <DatePicker locale={locale} name="recordDate" required className="mt-1" />
        </label>
        <label className="block text-sm font-semibold">
          {tx(locale, "Date de paiement", "Payment date")}
          <DatePicker locale={locale} name="paymentDate" required className="mt-1" />
        </label>
        <button className="rounded-full bg-violet px-4 py-2 font-semibold text-white">
          {tx(locale, "Proposer le versement", "Propose the payment")}
        </button>
      </form>
      {declarations.map((item) => (
        <p key={item.id} className="rounded-2xl bg-white p-3 text-sm">
          {formatMoney(item.perShareMinor, item.currencyCode, locale)} / {tx(locale, "action", "share")} · {item.status}
        </p>
      ))}
    </div>
  );
}
