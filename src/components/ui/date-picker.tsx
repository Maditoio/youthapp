"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { AppLocale } from "@/lib/config";
import { localeTag, tx } from "@/lib/i18n/tx";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type DatePickerProps = {
  locale: AppLocale;
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  id?: string;
  /** Accessible name for the field, separate from the empty-state placeholder. */
  label?: string;
  placeholder?: string;
  /**
   * When true, the submitted value is `YYYY-MM-DDTHH:mm` (datetime-local shape)
   * and the popover includes hour/minute controls. No native OS date/time UI.
   */
  withTime?: boolean;
};

type Box = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

type ParsedValue = {
  date: Date;
  hours: number;
  minutes: number;
};

function parseISODate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function parseValue(value: string | undefined | null, withTime: boolean): ParsedValue | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (withTime) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
    if (!match) {
      const dateOnly = parseISODate(trimmed);
      if (!dateOnly) return null;
      return { date: dateOnly, hours: 0, minutes: 0 };
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hours = Number(match[4]);
    const minutes = Number(match[5]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { date, hours, minutes };
  }
  const date = parseISODate(trimmed);
  if (!date) return null;
  return { date, hours: 0, minutes: 0 };
}

function formatISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatValue(date: Date, hours: number, minutes: number, withTime: boolean): string {
  const day = formatISODate(date);
  if (!withTime) return day;
  return `${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function weekStart(tag: string): number {
  try {
    const locale = new Intl.Locale(tag) as Intl.Locale & {
      weekInfo?: { firstDay?: number };
      getWeekInfo?: () => { firstDay?: number };
    };
    const first = locale.weekInfo?.firstDay ?? locale.getWeekInfo?.()?.firstDay;
    if (typeof first === "number") return first === 7 ? 0 : first;
  } catch {
    /* Older runtimes may not expose week info. Monday matches fr-FR and en-GB. */
  }
  return 1;
}

function weekdayLabels(tag: string, start: number): string[] {
  const sunday = new Date(2024, 0, 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + ((start + index) % 7));
    const raw = new Intl.DateTimeFormat(tag, { weekday: "short" }).format(date).replace(/\.$/, "");
    return raw.charAt(0).toLocaleUpperCase(tag) + raw.slice(1);
  });
}

function monthGrid(view: Date, start: number): Date[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const lead = (first.getDay() - start + 7) % 7;
  const gridStart = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function measure(trigger: HTMLElement, height: number): Box {
  const margin = 8;
  const rect = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(328, vw - margin * 2);
  let left = rect.left;
  if (left + width > vw - margin) left = vw - margin - width;
  if (left < margin) left = margin;
  const maxHeight = Math.max(220, vh - margin * 2);
  const gap = 8;
  const usable = Math.min(height, maxHeight);
  const belowTop = rect.bottom + gap;
  const aboveTop = rect.top - gap - usable;
  let top = belowTop;
  if (belowTop + usable > vh - margin && aboveTop >= margin) {
    top = aboveTop;
  } else if (belowTop + usable > vh - margin) {
    top = Math.max(margin, vh - margin - usable);
  }
  return { top, left, width, maxHeight };
}

function sameBox(a: Box, b: Box): boolean {
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.maxHeight - b.maxHeight) < 1
  );
}

export function DatePicker({
  locale,
  name,
  defaultValue,
  required,
  disabled,
  min,
  max,
  className,
  id,
  label,
  placeholder,
  withTime = false,
}: DatePickerProps) {
  const tag = localeTag(locale);
  const dialogId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);
  const focusDay = useRef(false);
  const initial = parseValue(defaultValue, withTime);
  const minParsed = parseValue(min, withTime);
  const maxParsed = parseValue(max, withTime);
  const minDate = minParsed?.date ?? null;
  const maxDate = maxParsed?.date ?? null;
  const [value, setValue] = useState(() =>
    initial ? formatValue(initial.date, initial.hours, initial.minutes, withTime) : "",
  );
  const [hours, setHours] = useState(() => initial?.hours ?? 0);
  const [minutes, setMinutes] = useState(() => initial?.minutes ?? 0);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<Date>(() => initial?.date ?? startOfDay(new Date()));
  const [view, setView] = useState(() => {
    const base = initial?.date ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [box, setBox] = useState<Box | null>(null);
  const [mounted, setMounted] = useState(false);

  const placeholderText =
    placeholder ??
    (withTime
      ? tx(locale, "Choisir une date et une heure", "Choose a date and time")
      : tx(locale, "Choisir une date", "Choose a date"));
  const selected = parseValue(value, withTime);
  const start = weekStart(tag);
  const labels = weekdayLabels(tag, start);
  const days = monthGrid(view, start);
  const today = startOfDay(new Date());
  const monthTitle = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(view);
  const display = selected
    ? withTime
      ? new Intl.DateTimeFormat(tag, {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(
          new Date(
            selected.date.getFullYear(),
            selected.date.getMonth(),
            selected.date.getDate(),
            selected.hours,
            selected.minutes,
          ),
        )
      : new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric" }).format(selected.date)
    : "";

  function isSelectable(date: Date): boolean {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  }

  function close(restoreFocus: boolean) {
    returnFocus.current = restoreFocus;
    setOpen(false);
  }

  function commit(date: Date, nextHours: number, nextMinutes: number, shouldClose: boolean) {
    if (!isSelectable(date)) return;
    setValue(formatValue(date, nextHours, nextMinutes, withTime));
    setHours(nextHours);
    setMinutes(nextMinutes);
    setCursor(date);
    if (shouldClose) close(true);
  }

  function selectDay(date: Date) {
    if (!isSelectable(date)) return;
    if (withTime) {
      commit(date, hours, minutes, false);
      return;
    }
    commit(date, 0, 0, true);
  }

  function openPicker() {
    const base = selected?.date ?? startOfDay(new Date());
    let next = base;
    if (!isSelectable(next)) {
      if (minDate && next < minDate) next = minDate;
      else if (maxDate && next > maxDate) next = maxDate;
    }
    setCursor(next);
    setView(new Date(next.getFullYear(), next.getMonth(), 1));
    if (selected) {
      setHours(selected.hours);
      setMinutes(selected.minutes);
    }
    if (triggerRef.current) setBox(measure(triggerRef.current, withTime ? 460 : 380));
    focusDay.current = true;
    setOpen(true);
  }

  function shiftMonth(offset: number) {
    const nextMonth = new Date(view.getFullYear(), view.getMonth() + offset, 1);
    setView(nextMonth);
    const daysInMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    let candidate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(cursor.getDate(), daysInMonth));
    if (!isSelectable(candidate)) {
      for (let day = 1; day <= daysInMonth; day += 1) {
        const probe = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
        if (isSelectable(probe)) {
          candidate = probe;
          break;
        }
      }
    }
    if (isSelectable(candidate)) setCursor(candidate);
  }

  function moveCursor(delta: number) {
    const step = delta < 0 ? -1 : 1;
    let next = addDays(cursor, delta);
    for (let guard = 0; guard < 800 && !isSelectable(next); guard += 1) {
      next = addDays(next, step);
    }
    if (!isSelectable(next)) return;
    focusDay.current = true;
    setCursor(next);
    setView(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    triggerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !focusDay.current) return;
    focusDay.current = false;
    const iso = formatISODate(cursor);
    popoverRef.current?.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)?.focus({ preventScroll: true });
  }, [open, cursor]);

  useIsoLayoutEffect(() => {
    if (!open) return;
    function place() {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger) return;
      const next = measure(trigger, popover?.offsetHeight ?? (withTime ? 460 : 380));
      setBox((current) => (current && sameBox(current, next) ? current : next));
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, view, withTime, hours, minutes]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      if (withTime && selected) {
        setValue(formatValue(selected.date, hours, minutes, true));
      }
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, withTime, selected, hours, minutes]);

  function onDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    const target = event.target as HTMLElement;
    if (target.tagName === "SELECT") return;
    if (event.key === "Enter") {
      event.preventDefault();
      const nav = target.closest<HTMLButtonElement>("[data-month-nav]");
      if (nav) {
        nav.click();
        return;
      }
      if (withTime) {
        commit(cursor, hours, minutes, true);
        return;
      }
      selectDay(cursor);
      return;
    }
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (delta == null) return;
    event.preventDefault();
    moveCursor(delta);
  }

  const shown = display || placeholderText;
  const accessible = label ? `${label}, ${shown}` : undefined;
  const selectedIso = selected ? formatISODate(selected.date) : "";

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={accessible}
        onClick={() => (open ? close(false) : openPicker())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-2xl border border-border bg-white px-4 text-left text-sm text-ink",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted",
          open && "border-violet shadow-[0_0_0_4px_rgba(109,77,255,0.14)]",
          className,
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-violet" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{shown}</span>
      </button>
      {/* type=text so the operating-system calendar never opens. The named value is what the server reads. */}
      <input
        type="text"
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        autoComplete="off"
        inputMode="none"
        aria-hidden="true"
        onChange={() => {}}
        className="pointer-events-none absolute inset-0 -z-10 opacity-0"
      />
      {mounted && open && box
        ? createPortal(
            <div
              ref={popoverRef}
              id={dialogId}
              role="dialog"
              aria-modal="false"
              aria-label={monthTitle}
              onKeyDown={onDialogKeyDown}
              style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
              className="date-pop fixed z-50 overflow-x-hidden overflow-y-auto rounded-[28px] border border-border bg-white p-3 shadow-[0_18px_40px_rgba(70,52,140,0.16)]"
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <MonthButton
                    label={tx(locale, "Année précédente", "Previous year")}
                    onClick={() => shiftMonth(-12)}
                  >
                    <ChevronsLeft className="size-4" />
                  </MonthButton>
                  <MonthButton
                    label={tx(locale, "Mois précédent", "Previous month")}
                    onClick={() => shiftMonth(-1)}
                  >
                    <ChevronLeft className="size-4" />
                  </MonthButton>
                </div>
                <p className="px-1 text-center text-sm font-bold capitalize text-ink">{monthTitle}</p>
                <div className="flex gap-1">
                  <MonthButton label={tx(locale, "Mois suivant", "Next month")} onClick={() => shiftMonth(1)}>
                    <ChevronRight className="size-4" />
                  </MonthButton>
                  <MonthButton label={tx(locale, "Année suivante", "Next year")} onClick={() => shiftMonth(12)}>
                    <ChevronsRight className="size-4" />
                  </MonthButton>
                </div>
              </div>
              <div className="grid grid-cols-7 pb-1" aria-hidden="true">
                {labels.map((dayLabel, index) => (
                  <div key={`${dayLabel}-${index}`} className="py-1 text-center text-[0.68rem] font-semibold tracking-wide text-muted">
                    {dayLabel}
                  </div>
                ))}
              </div>
              <div role="grid" className="grid grid-cols-7">
                {days.map((date) => {
                  const iso = formatISODate(date);
                  const enabled = isSelectable(date);
                  const isSelected = selectedIso === iso;
                  const isToday = date.getTime() === today.getTime();
                  const outside = date.getMonth() !== view.getMonth();
                  const full = new Intl.DateTimeFormat(tag, { dateStyle: "full" }).format(date);
                  if (!enabled) {
                    return (
                      <div key={iso} role="gridcell" className="flex min-w-0 items-center justify-center py-0.5">
                        <span className="grid aspect-square w-full max-w-10 place-items-center text-sm text-muted/40">
                          {date.getDate()}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={iso} role="gridcell" aria-selected={isSelected} className="flex min-w-0 items-center justify-center py-0.5">
                      <button
                        type="button"
                        data-date={iso}
                        aria-label={full}
                        aria-pressed={isSelected}
                        aria-current={isToday ? "date" : undefined}
                        onClick={() => selectDay(date)}
                        className={cn(
                          "relative grid aspect-square w-full max-w-10 place-items-center rounded-full text-sm font-semibold leading-none",
                          "transition-[transform,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          "hover:bg-lilac active:scale-[0.96]",
                          outside ? "text-muted" : "text-ink",
                          isToday && !isSelected && "bg-lilac text-violet",
                          isSelected && "bg-violet text-white shadow-[0_8px_18px_rgba(109,77,255,0.35)] hover:bg-violet-deep",
                        )}
                      >
                        {date.getDate()}
                        {isToday ? (
                          <span
                            className={cn("absolute bottom-1 size-1 rounded-full", isSelected ? "bg-white" : "bg-violet")}
                          />
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
              {withTime ? (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted">{tx(locale, "Heure", "Time")}</p>
                  <div className="flex items-center gap-2">
                    <label className="min-w-0 flex-1 space-y-1">
                      <span className="sr-only">{tx(locale, "Heure", "Hour")}</span>
                      <select
                        value={hours}
                        onChange={(event) => {
                          const nextHours = Number(event.target.value);
                          setHours(nextHours);
                          const day = selected?.date ?? cursor;
                          setValue(formatValue(day, nextHours, minutes, true));
                        }}
                        className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-semibold text-ink"
                      >
                        {Array.from({ length: 24 }, (_, hour) => (
                          <option key={hour} value={hour}>
                            {String(hour).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="text-sm font-bold text-muted" aria-hidden="true">
                      :
                    </span>
                    <label className="min-w-0 flex-1 space-y-1">
                      <span className="sr-only">{tx(locale, "Minutes", "Minutes")}</span>
                      <select
                        value={minutes}
                        onChange={(event) => {
                          const nextMinutes = Number(event.target.value);
                          setMinutes(nextMinutes);
                          const day = selected?.date ?? cursor;
                          setValue(formatValue(day, hours, nextMinutes, true));
                        }}
                        className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-semibold text-ink"
                      >
                        {Array.from({ length: 60 }, (_, minute) => (
                          <option key={minute} value={minute}>
                            {String(minute).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => commit(selected?.date ?? cursor, hours, minutes, true)}
                    className="flex h-11 w-full items-center justify-center rounded-full bg-violet text-sm font-semibold text-white hover:bg-violet-deep"
                  >
                    {tx(locale, "Valider", "Done")}
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-month-nav=""
      aria-label={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full text-violet hover:bg-lilac"
    >
      {children}
    </button>
  );
}
