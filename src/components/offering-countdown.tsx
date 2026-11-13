"use client";

import { useEffect, useState } from "react";
import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";

function partsUntil(targetIso: string, nowMs: number) {
  const target = Date.parse(targetIso);
  if (!Number.isFinite(target)) return null;
  const diff = target - nowMs;
  if (diff <= 0) return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    totalMs: diff,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function OfferingCountdown({
  locale,
  opensAt,
  labelFr = "Ouverture dans",
  labelEn = "Opens in",
}: {
  locale: AppLocale;
  opensAt: string;
  labelFr?: string;
  labelEn?: string;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = partsUntil(opensAt, nowMs);
  if (!parts) return null;
  if (parts.totalMs <= 0) {
    return (
      <p className="text-sm font-semibold text-ink">
        {tx(locale, "La fenêtre d'ouverture est atteinte.", "The open window has been reached.")}
      </p>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="rounded-[24px] border border-border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {tx(locale, labelFr, labelEn)}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
        {parts.days > 0 ? `${parts.days}d ` : ""}
        {pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}
      </p>
    </div>
  );
}
