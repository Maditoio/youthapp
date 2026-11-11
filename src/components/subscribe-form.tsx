"use client";

import { useState } from "react";
import { useActionState } from "react";
import { quoteAction, subscribeAction } from "@/server/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionFeedback } from "@/components/use-action-feedback";
import type { AppLocale } from "@/lib/config";
import { errorCopy } from "@/server/domain/errors";
import { tx } from "@/lib/i18n/tx";

export function SubscribeForm({
  locale,
  offeringId,
  documents,
}: {
  locale: AppLocale;
  offeringId: string;
  documents: { id: string; title: string }[];
}) {
  const [state, action] = useActionState(subscribeAction, {});
  useActionFeedback(state, locale);
  const [quote, setQuote] = useState<string>("");
  return (
    <form action={action} className="space-y-3 rounded-[28px] bg-white p-5">
      <input type="hidden" name="offeringId" value={offeringId} />
      <label className="block text-sm font-semibold">
        {tx(locale, "Montant (USD)", "Amount (USD)")}
        <input
          name="amount"
          inputMode="decimal"
          required
          placeholder="100.00"
          className="mt-1 h-12 w-full rounded-2xl border border-border px-4"
          onBlur={async (event) => {
            const result = await quoteAction(offeringId, event.target.value);
            if (!result.ok) {
              setQuote(errorCopy[result.error]?.[locale] ?? result.error);
              return;
            }
            setQuote(
              tx(
                locale,
                `${result.shareQuantity} actions à émettre si le paiement puis l'allotissement sont confirmés. Total ${result.totalMinor / 100} USD, frais ${result.feeMinor / 100} USD.`,
                `${result.shareQuantity} shares would be issued only after payment and allotment. Total USD ${result.totalMinor / 100}, fees USD ${result.feeMinor / 100}.`,
              ),
            );
          }}
        />
      </label>
      {quote ? <p className="text-sm text-muted">{quote}</p> : null}
      {documents.map((doc) => (
        <label key={doc.id} className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="documentId" value={doc.id} required className="mt-1" />
          {tx(locale, "J'ai lu", "I have read")} {doc.title}
        </label>
      ))}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="risk" required className="mt-1" />
        {tx(locale, "Je peux perdre tout le montant. Aucun rendement, aucune liquidité et aucun rachat ne sont promis.", "I can lose the entire amount. No return, liquidity or buyback is promised.")}
      </label>
      {state.error ? <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      <SubmitButton>
        {tx(locale, "Créer la souscription", "Create subscription")}
      </SubmitButton>
    </form>
  );
}
