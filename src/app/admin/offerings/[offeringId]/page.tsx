import { notFound } from "next/navigation";
import { offeringTransitionAction } from "@/server/actions";
import { OFFERING_TRANSITIONS } from "@/server/domain/finance";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function OfferingAdmin({ params }: { params: Promise<{ offeringId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const { offeringId } = await params;
  const offering = session.db.offerings.find((item) => item.id === offeringId);
  if (!offering) notFound();
  const next = OFFERING_TRANSITIONS[offering.status];
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, offering.nameFr, offering.nameEn)}</h1>
      <p>{offering.status}</p>
      <form action={offeringTransitionAction} className="space-y-2 rounded-[24px] bg-white p-4">
        <input type="hidden" name="offeringId" value={offering.id} />
        <input name="reason" required placeholder={tx(locale, "Motif", "Reason")} className="h-11 w-full rounded-2xl border px-3" />
        <div className="flex flex-wrap gap-2">
          {next.map((status) => (
            <button key={status} name="to" value={status} className="rounded-full bg-violet px-3 py-2 text-xs font-semibold text-white">{status}</button>
          ))}
        </div>
      </form>
    </div>
  );
}
