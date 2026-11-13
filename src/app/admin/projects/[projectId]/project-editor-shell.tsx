"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

export type ProjectEditorSection = {
  id: string;
  label: string;
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
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-canvas/95 px-4 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="py-4">{header}</div>
        <nav aria-label={navAriaLabel} className="-mb-px">
          <div className="flex gap-6 overflow-x-auto" role="tablist">
            {sections.map((section) => {
              const current = section.id === active?.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  role="tab"
                  aria-selected={current}
                  aria-controls={section.id}
                  className={
                    current
                      ? "shrink-0 border-b-2 border-violet pb-3 text-sm font-semibold text-ink"
                      : "shrink-0 border-b-2 border-transparent pb-3 text-sm font-medium text-muted hover:text-ink"
                  }
                  onClick={() => setActiveId(section.id)}
                >
                  {section.label}
                </a>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="min-w-0">
        {active ? (
          <section
            id={active.id}
            role="tabpanel"
            className="scroll-mt-36 space-y-4 rounded-[24px] bg-white p-5 md:p-6"
          >
            {active.panel}
          </section>
        ) : null}
      </div>
    </div>
  );
}
