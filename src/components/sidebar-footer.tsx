"use client";

import Link from "next/link";
import { BookOpen, CircleHelp, Info, LogOut, Settings2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";
import { cn } from "@/lib/utils";

export type SidebarShellKind = "admin" | "investor" | "issuer";

type FooterMenuLink = {
  id: string;
  kind: "link";
  href: string;
  label: string;
  icon: ReactNode;
};

type FooterMenuAction = {
  id: string;
  kind: "sign-out";
  label: string;
  icon: ReactNode;
};

export type FooterMenuItem = FooterMenuLink | FooterMenuAction;

function supportHref(shell: SidebarShellKind) {
  if (shell === "investor") return "/investor/support";
  if (shell === "admin") return "/admin/support";
  return "/contact";
}

function defaultMenuItems(locale: AppLocale, shell: SidebarShellKind): FooterMenuItem[] {
  const iconClass = "h-4 w-4 shrink-0 text-muted";
  return [
    {
      id: "sign-out",
      kind: "sign-out",
      label: tx(locale, "Sortir", "Sign out"),
      icon: <LogOut className={iconClass} aria-hidden />,
    },
    {
      id: "about",
      kind: "link",
      href: "/about",
      label: tx(locale, "À propos", "About us"),
      icon: <Info className={iconClass} aria-hidden />,
    },
    {
      id: "support",
      kind: "link",
      href: supportHref(shell),
      label: tx(locale, "Assistance", "Support"),
      icon: <CircleHelp className={iconClass} aria-hidden />,
    },
    {
      id: "docs",
      kind: "link",
      href: "/learn",
      label: tx(locale, "Docs", "Docs"),
      icon: <BookOpen className={iconClass} aria-hidden />,
    },
  ];
}

const itemClass =
  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-60";

/**
 * Sidenav trailing control: gear opens a compact menu above the footer.
 * Pass `items` to extend or replace the default Sign out / About / Support / Docs set.
 */
export function SidebarFooter({
  locale,
  shell,
  items,
}: {
  locale: AppLocale;
  shell: SidebarShellKind;
  items?: FooterMenuItem[];
}) {
  const menu = items ?? defaultMenuItems(locale, shell);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>("[role='menuitem']");
    first?.focus();

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={tx(locale, "Menu du compte", "Account menu")}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors",
          "hover:bg-surface-muted",
          open && "bg-surface-muted text-ink",
        )}
      >
        <Settings2 className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={tx(locale, "Menu du compte", "Account menu")}
          className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 w-48 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-[var(--shadow-card)]"
        >
          <ul className="flex flex-col gap-0.5">
            {menu.map((item) => (
              <li key={item.id} role="none">
                {item.kind === "link" ? (
                  <Link
                    role="menuitem"
                    href={item.href}
                    className={itemClass}
                    onClick={() => setOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ) : (
                  <SignOutButton role="menuitem" className={itemClass}>
                    {item.icon}
                    {item.label}
                  </SignOutButton>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
