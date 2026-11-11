"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import type { AppLocale } from "@/lib/config";
import { errorMessage, noticeMessage } from "@/server/domain/notices";

/**
 * Server actions redirect with `?notice=CODE` or `?error=CODE`. This shows the
 * matching toast once, then drops the params with `history.replaceState`, which
 * Next syncs into the router without re-rendering the server page — inline
 * `?error=` copy already on screen stays visible, and a reload does not re-toast.
 */
export function FlashToaster({ locale }: { locale: AppLocale }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const notice = params.get("notice");
    const error = params.get("error");
    if (!notice && !error) {
      handled.current = null;
      return;
    }
    const key = `${pathname}?${params.toString()}`;
    if (handled.current === key) return;
    handled.current = key;

    if (notice) toast({ variant: "success", title: noticeMessage(notice, locale) });
    if (error) toast({ variant: "error", title: errorMessage(error, locale) });

    const rest = new URLSearchParams(params.toString());
    rest.delete("notice");
    rest.delete("error");
    const query = rest.toString();
    window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [params, pathname, toast, locale]);

  return null;
}
