"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import type { AppLocale } from "@/lib/config";
import { errorMessage, noticeMessage } from "@/server/domain/notices";

/** Toasts the outcome of a `useActionState` server action (each result is a fresh object). */
export function useActionFeedback(
  state: { error?: string; ok?: boolean },
  locale: AppLocale,
  successNotice?: string,
) {
  const { toast } = useToast();
  useEffect(() => {
    if (state.error) toast({ variant: "error", title: errorMessage(state.error, locale) });
    else if (state.ok && successNotice) toast({ variant: "success", title: noticeMessage(successNotice, locale) });
  }, [state, locale, successNotice, toast]);
}
