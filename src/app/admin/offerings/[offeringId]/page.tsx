import { notFound } from "next/navigation";
import { AdminReasonField } from "@/components/admin-reason-field";
import { offeringTransitionAction } from "@/server/actions";
import { errorCopy } from "@/server/domain/errors";
import { OFFERING_TRANSITIONS } from "@/server/domain/finance";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function OfferingAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ offeringId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const { offeringId } = await params;
  const error = (await searchParams).error;
  const offering = session.db.offerings.find((item) => item.id === offeringId);
  if (!offering) notFound();
  const next = OFFERING_TRANSITIONS[offering.status];
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, offering.nameFr, offering.nameEn)}</h1>
      <p>{offering.status}</p>
      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
      <form action={offeringTransitionAction} className="space-y-2 rounded-[24px] bg-white p-4">
        <input type="hidden" name="offeringId" value={offering.id} />
        <AdminReasonField
          placeholder={tx(locale, "Motif", "Reason")}
          className="h-11 w-full rounded-2xl border px-3"
        />
        <div className="flex flex-wrap gap-2">
          {next.map((status) => (
            <SubmitButton key={status} name="to" value={status} size="sm" className="text-xs">
              {status}
            </SubmitButton>
          ))}
        </div>
        {next.length === 0 ? (
          <p className="text-sm text-muted">{tx(locale, "Aucune transition disponible.", "No transitions available.")}</p>
        ) : (
          <p className="text-xs text-muted">
            {tx(
              locale,
              "Utilisez un bouton de statut pour soumettre. Entrée dans le motif ne change pas le statut.",
              "Use a status button to submit. Enter in the reason field does not change status.",
            )}
          </p>
        )}
      </form>
    </div>
  );
}
