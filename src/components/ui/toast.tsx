"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export interface ToastInput {
  variant?: ToastVariant;
  title: string;
  description?: string;
  /** Milliseconds before auto-dismiss. Defaults to 5s, 8s for errors. */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastInput, "variant" | "title" | "duration">> {
  id: number;
  description?: string;
}

interface ToastApi {
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const MAX_VISIBLE = 4;

export function ToastProvider({ locale, children }: { locale: AppLocale; children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const variant = input.variant ?? "info";
    const item: ToastItem = {
      id: nextId.current++,
      variant,
      title: input.title,
      description: input.description,
      duration: input.duration ?? (variant === "error" ? 8000 : 5000),
    };
    setItems((current) => {
      const duplicate = current.find(
        (existing) => existing.title === item.title && existing.variant === item.variant,
      );
      const rest = duplicate ? current.filter((existing) => existing !== duplicate) : current;
      return [...rest, item].slice(-MAX_VISIBLE);
    });
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section
        aria-label={tx(locale, "Notifications", "Notifications")}
        className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:top-4 sm:right-4 sm:w-[24rem]"
      >
        <div aria-live="polite" aria-relevant="additions" className="flex flex-col gap-2">
          {items.map((item) => (
            <ToastCard key={item.id} item={item} locale={locale} onDismiss={dismiss} />
          ))}
        </div>
      </section>
    </ToastContext.Provider>
  );
}

const variantStyles: Record<ToastVariant, { icon: typeof Info; badge: string; bar: string }> = {
  success: { icon: CheckCircle2, badge: "bg-success/12 text-success", bar: "bg-success" },
  error: { icon: CircleAlert, badge: "bg-danger/12 text-danger", bar: "bg-danger" },
  info: { icon: Info, badge: "bg-surface-muted text-violet-ink", bar: "bg-gold" },
};

function ToastCard({
  item,
  locale,
  onDismiss,
}: {
  item: ToastItem;
  locale: AppLocale;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const style = variantStyles[item.variant];
  const Icon = style.icon;

  const remaining = useRef(item.duration);

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [paused, item.id, onDismiss]);

  return (
    <div
      role={item.variant === "error" ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="toast-enter pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-3xl border border-border bg-surface p-4 pr-11 text-ink shadow-[var(--shadow-card)]"
    >
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", style.badge)}>
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        {item.description ? <p className="mt-1 text-sm text-muted">{item.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label={tx(locale, "Fermer la notification", "Dismiss notification")}
        className="absolute top-3 right-3 grid size-7 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
      <span
        aria-hidden="true"
        className={cn("toast-timer absolute bottom-0 left-0 h-0.5 w-full origin-left", style.bar)}
        style={{ animationDuration: `${item.duration}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
