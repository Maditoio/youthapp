"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookUser,
  Building2,
  ChartColumn,
  ClipboardList,
  CreditCard,
  Ellipsis,
  FileSignature,
  FileText,
  FolderKanban,
  HandCoins,
  House,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Menu,
  Newspaper,
  PieChart,
  Receipt,
  Scale,
  ScanFace,
  ScrollText,
  Settings,
  Store,
  Tag,
  UserCog,
  UserRound,
  Users,
  Vote,
  Bell,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./visuals";

/** Icons are referenced by name so server layouts can describe navigation as plain data. */
const icons = {
  bar: BarChart3,
  bell: Bell,
  book: BookUser,
  building: Building2,
  chart: ChartColumn,
  clipboard: ClipboardList,
  card: CreditCard,
  contract: FileSignature,
  file: FileText,
  folder: FolderKanban,
  coins: HandCoins,
  home: House,
  bank: Landmark,
  dashboard: LayoutDashboard,
  support: LifeBuoy,
  megaphone: Megaphone,
  news: Newspaper,
  pie: PieChart,
  receipt: Receipt,
  scale: Scale,
  identity: ScanFace,
  scroll: ScrollText,
  settings: Settings,
  store: Store,
  tag: Tag,
  staff: UserCog,
  user: UserRound,
  users: Users,
  vote: Vote,
} as const;

export type NavIconName = keyof typeof icons;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  /** Only match this exact path (used for section roots such as `/admin`). */
  exact?: boolean;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

function activeHref(path: string, items: NavItem[]) {
  let best: string | null = null;
  for (const item of items) {
    const hit = item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
    if (hit && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}

function SidebarBody({
  homeHref,
  area,
  userName,
  userMeta,
  groups,
  active,
  footer,
  navLabel,
  onNavigate,
  closeButton,
}: {
  homeHref: string;
  area: string;
  userName: string;
  userMeta?: string;
  groups: NavGroup[];
  active: string | null;
  footer?: ReactNode;
  navLabel: string;
  onNavigate?: () => void;
  closeButton?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-5">
        <Link href={homeHref} onClick={onNavigate} className="flex min-w-0 items-center gap-2">
          <Logo />
          <span className="accent-chip-soft rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {area}
          </span>
        </Link>
        {closeButton}
      </div>

      <nav aria-label={navLabel} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mt-4 first:mt-1">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted/80">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = icons[item.icon];
                const current = item.href === active;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        current
                          ? "bg-surface-muted text-ink"
                          : "text-ink/75 hover:bg-surface-muted hover:text-ink",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-1.5 left-0 w-1 rounded-full bg-gold transition-opacity",
                          current ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <Icon
                        aria-hidden
                        className={cn("h-[18px] w-[18px] shrink-0", current ? "text-violet-ink" : "text-muted group-hover:text-ink")}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-full bg-pink px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <div
            className={cn(
              "min-w-0 flex-1 overflow-hidden",
              "[mask-image:linear-gradient(to_right,black_0%,black_calc(100%-1.25rem),transparent_100%)]",
              "[-webkit-mask-image:linear-gradient(to_right,black_0%,black_calc(100%-1.25rem),transparent_100%)]",
            )}
          >
            <p className="whitespace-nowrap text-sm font-semibold text-ink">{userName}</p>
            {userMeta ? <p className="whitespace-nowrap text-xs text-muted">{userMeta}</p> : null}
          </div>
          {footer}
        </div>
      </div>
    </div>
  );
}

/**
 * Left sidebar shell: sticky full-height grouped navigation on desktop, a drawer below `lg`.
 * With `mobileTabs`, small screens get a bottom tab bar whose last button opens the drawer;
 * otherwise a slim top bar with a menu button is shown.
 */
export function SidebarShell({
  homeHref,
  area,
  userName,
  userMeta,
  groups,
  footer,
  mobileTabs,
  labels,
  mainClassName,
  children,
}: {
  homeHref: string;
  area: string;
  userName: string;
  userMeta?: string;
  groups: NavGroup[];
  footer?: ReactNode;
  mobileTabs?: NavItem[];
  labels: { nav: string; menu: string; close: string; more: string };
  mainClassName?: string;
  children: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const allItems = groups.flatMap((group) => group.items);
  const active = activeHref(path, allItems);
  const tabActive = mobileTabs ? activeHref(path, mobileTabs) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const body = {
    homeHref,
    area,
    userName,
    userMeta,
    groups,
    active,
    footer,
    navLabel: labels.nav,
  };

  return (
    <div className="min-h-dvh bg-canvas lg:flex print:bg-white">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-surface print:hidden lg:block xl:w-72">
        <SidebarBody {...body} />
      </aside>

      {mobileTabs ? null : (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur print:hidden lg:hidden">
          <Link href={homeHref} className="flex items-center gap-2">
            <Logo />
            <span className="accent-chip-soft rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {area}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls={drawerId}
            className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-surface-muted"
          >
            <Menu className="h-5 w-5" aria-hidden />
            <span className="sr-only">{labels.menu}</span>
          </button>
        </header>
      )}

      <div
        className={cn(
          "fixed inset-0 z-40 print:hidden lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div
          className={cn("absolute inset-0 bg-ink/40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
          onClick={close}
        />
        <div
          id={drawerId}
          role="dialog"
          aria-modal="true"
          aria-label={labels.nav}
          {...(!open ? { inert: true as const } : {})}
          className={cn(
            "absolute inset-y-0 left-0 w-[min(20rem,86vw)] bg-surface shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarBody
            {...body}
            onNavigate={close}
            closeButton={
              <button
                type="button"
                onClick={close}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-muted hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden />
                <span className="sr-only">{labels.close}</span>
              </button>
            }
          />
        </div>
      </div>

      <main className={cn("min-w-0 flex-1 print:bg-white print:p-0", mainClassName)}>{children}</main>

      {mobileTabs ? (
        <nav
          aria-label={labels.nav}
          className="fixed inset-x-3 bottom-3 z-30 rounded-[28px] border border-border bg-surface/95 px-2 py-2 shadow-[var(--shadow-card)] backdrop-blur print:hidden lg:hidden"
        >
          <ul className="mx-auto flex max-w-lg items-end justify-between">
            {mobileTabs.map((item) => {
              const Icon = icons[item.icon];
              const current = item.href === tabActive;
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1 text-[11px] font-semibold",
                      current ? "text-ink" : "text-muted",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", current ? "text-violet-ink" : "")} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={open}
                aria-controls={drawerId}
                className={cn(
                  "flex w-full flex-col items-center gap-1 text-[11px] font-semibold",
                  active && !tabActive ? "text-ink" : "text-muted",
                )}
              >
                <Ellipsis className="h-5 w-5" aria-hidden />
                {labels.more}
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
