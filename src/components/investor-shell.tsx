"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, FolderKanban, Home, PieChart, UserRound, Vote } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";
import { Logo } from "./visuals";

export interface ShellLabels {
  dashboard: string;
  statistics: string;
  projects: string;
  portfolio: string;
  votes: string;
  profile: string;
  signOut: string;
}

const investorLinks = [
  { href: "/investor", key: "dashboard", icon: Home },
  { href: "/investor/statistics", key: "statistics", icon: BarChart3 },
  { href: "/projects", key: "projects", icon: FolderKanban },
  { href: "/investor/holdings", key: "portfolio", icon: PieChart },
  { href: "/investor/votes", key: "votes", icon: Vote },
  { href: "/investor/profile", key: "profile", icon: UserRound },
] as const;

export function InvestorShell({
  name,
  labels,
  children,
}: {
  name: string;
  labels: ShellLabels;
  children: ReactNode;
}) {
  const path = usePathname();
  const mobile = [
    investorLinks[0],
    investorLinks[1],
    investorLinks[2],
    investorLinks[5],
  ];
  return (
    <div className="min-h-dvh bg-canvas md:p-4">
      <div className="mx-auto flex min-h-dvh max-w-[1240px] md:min-h-[calc(100dvh-2rem)] md:gap-4">
        <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-[88px] shrink-0 flex-col items-center rounded-[32px] bg-violet py-5 text-white shadow-[var(--shadow-card)] md:flex">
          <Logo light compact />
          <nav className="mt-8 flex flex-1 flex-col items-center gap-3">
            {investorLinks.map((item) => {
              const active = path === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={labels[item.key]}
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-2xl",
                    active ? "bg-white text-violet" : "text-white/80 hover:bg-white/15",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </nav>
          <SignOutButton className="rounded-full px-2 py-2 text-[10px] font-semibold text-white/80">
            {labels.signOut}
          </SignOutButton>
        </aside>
        <div className="min-w-0 flex-1 pb-36 md:pb-0">{children}</div>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-20 rounded-[28px] border border-white/80 bg-white/90 px-2 py-2 shadow-[var(--shadow-card)] backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg items-end justify-between">
          {mobile.map((item) => {
            const active = path === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link href={item.href} className={cn("flex flex-col items-center gap-1 text-[11px] font-semibold", active ? "text-violet" : "text-muted")}>
                  <Icon className="h-5 w-5" />
                  {labels[item.key]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <span className="sr-only">{name}</span>
    </div>
  );
}

export function DeskTop({
  title,
  name,
  action,
}: {
  title: string;
  name: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 hidden items-center justify-between gap-4 md:flex">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <div className="flex items-center gap-3">
        {action}
        <div className="grid h-10 w-10 place-items-center rounded-full bg-violet text-sm font-bold text-white">
          {name.slice(0, 1)}
        </div>
      </div>
    </div>
  );
}
