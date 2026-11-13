"use client";

import { useActionState } from "react";
import { expressInterestAction, withdrawInterestAction } from "@/server/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionFeedback } from "@/components/use-action-feedback";
import type { AppLocale } from "@/lib/config";
import { formatMoney } from "@/lib/format";
import { errorCopy } from "@/server/domain/errors";
import { tx } from "@/lib/i18n/tx";

export function InterestForm({
  locale,
  offeringId,
  currencyCode,
  minimumLabel,
  existing,
}: {
  locale: AppLocale;
  offeringId: string;
  currencyCode: string;
  minimumLabel: string;
  existing: {
    id: string;
    intendedAmountMinor: number;
    intendedShareQuantity: number;
    remindAtOpen: boolean;
  } | null;
}) {
  const [state, action] = useActionState(expressInterestAction, {});
  useActionFeedback(state, locale);

  return (
    <div className="space-y-4 rounded-[28px] bg-white p-5">
      <div>
        <h2 className="text-lg font-bold">
          {tx(locale, "Manifester un intérêt", "Express interest")}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {tx(
            locale,
            "Sans paiement. Cela nous aide à mesurer la demande avant l'ouverture. Vous serez notifié à l'ouverture si le rappel est activé.",
            "No payment. This helps measure demand before open. You will be notified at open if the reminder is on.",
          )}
        </p>
        <p className="mt-1 text-sm text-muted">
          {tx(locale, "Minimum indicatif", "Indicative minimum")} {minimumLabel}
        </p>
      </div>

      {existing ? (
        <div className="rounded-2xl bg-[var(--surface-muted)] p-4 text-sm">
          <p className="font-semibold">
            {tx(locale, "Votre intention actuelle", "Your current intention")}
          </p>
          <p className="mt-1">
            {formatMoney(existing.intendedAmountMinor, currencyCode, locale)} ·{" "}
            {existing.intendedShareQuantity}{" "}
            {tx(locale, "actions", "shares")}
          </p>
          <p className="mt-1 text-muted">
            {existing.remindAtOpen
              ? tx(locale, "Rappel à l'ouverture : activé", "Open reminder: on")
              : tx(locale, "Rappel à l'ouverture : désactivé", "Open reminder: off")}
          </p>
          <form action={withdrawInterestAction} className="mt-3">
            <input type="hidden" name="id" value={existing.id} />
            <input type="hidden" name="offeringId" value={offeringId} />
            <SubmitButton variant="danger" size="inline">
              {tx(locale, "Retirer l'intérêt", "Withdraw interest")}
            </SubmitButton>
          </form>
        </div>
      ) : null}

      <form action={action} className="space-y-3">
        <input type="hidden" name="offeringId" value={offeringId} />
        <label className="block text-sm font-semibold">
          {tx(locale, "Montant envisagé (USD)", "Intended amount (USD)")}
          <input
            name="amount"
            inputMode="decimal"
            required
            placeholder="100.00"
            defaultValue={
              existing ? (existing.intendedAmountMinor / 100).toFixed(2) : undefined
            }
            className="mt-1 h-12 w-full rounded-2xl border border-border px-4"
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="remind"
            value="on"
            defaultChecked={existing?.remindAtOpen ?? true}
            className="mt-1"
          />
          {tx(
            locale,
            "Me rappeler 24 h avant et à l'ouverture (notification in-app)",
            "Remind me 24h before and at open (in-app notification)",
          )}
        </label>
        {state.error ? (
          <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p>
        ) : null}
        <SubmitButton>
          {existing
            ? tx(locale, "Mettre à jour l'intérêt", "Update interest")
            : tx(locale, "Enregistrer mon intérêt", "Save my interest")}
        </SubmitButton>
      </form>
    </div>
  );
}
