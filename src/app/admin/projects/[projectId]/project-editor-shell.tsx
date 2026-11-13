"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

export type ProjectEditorSection = {
  id: string;
  label: string;
  description?: string;
  panel: ReactNode;
};

type ProjectEditorShellProps = {
  sections: ProjectEditorSection[];
  header: ReactNode;
  navAriaLabel: string;
};

function readHash(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const hash = window.location.hash.replace(/^#/, "").trim();
  return hash || fallback;
}

export function ProjectEditorShell({ sections, header, navAriaLabel }: ProjectEditorShellProps) {
  const fallback = sections[0]?.id ?? "overview";
  const ids = sections.map((section) => section.id).join("|");
  const [activeId, setActiveId] = useState(fallback);

  const syncFromHash = useCallback(() => {
    const next = readHash(fallback);
    const allowed = ids.split("|");
    if (allowed.includes(next)) setActiveId(next);
  }, [fallback, ids]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-canvas/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        {header}
      </div>

      <div className="grid gap-5 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label={navAriaLabel} className="lg:sticky lg:top-[8.5rem] lg:self-start">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
            {sections.map((section) => {
              const current = section.id === active?.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={current ? "page" : undefined}
                  className={
                    current
                      ? "shrink-0 rounded-2xl bg-violet px-3 py-2 text-sm font-semibold text-white"
                      : "shrink-0 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-ink ring-1 ring-border hover:bg-lilac/50"
                  }
                  onClick={() => setActiveId(section.id)}
                >
                  {section.label}
                </a>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0">
          {active ? (
            <section
              id={active.id}
              className="scroll-mt-36 space-y-4 rounded-[24px] bg-white p-5 md:p-6"
            >
              <div className="space-y-1 border-b border-border pb-4">
                <h2 className="text-xl font-bold">{active.label}</h2>
                {active.description ? (
                  <p className="max-w-2xl text-sm text-muted">{active.description}</p>
                ) : null}
              </div>
              {active.panel}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
