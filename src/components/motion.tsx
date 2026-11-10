"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, type ReactNode } from "react";

const selector = "article, section, aside, form";

/** Remounts on navigation and reveals blocks as they enter the screen. */
export function MotionRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const reduce = new Set<HTMLElement>();
    for (const node of nodes) {
      if (node.parentElement && reduce.has(node.parentElement)) continue;
      const parentCard = node.parentElement?.closest(selector);
      if (parentCard && root.contains(parentCard)) reduce.add(node);
    }

    const cards = nodes.filter((node) => !reduce.has(node));
    cards.forEach((node, index) => {
      node.style.setProperty("--rise", String(Math.min(index, 8)));
    });

    const waiting = cards.filter((node) => {
      const box = node.getBoundingClientRect();
      return box.top > window.innerHeight * 0.92;
    });
    for (const node of waiting) node.style.animationPlayState = "paused";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          target.style.animationPlayState = "running";
          observer.unobserve(target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    for (const node of waiting) observer.observe(node);
    const release = window.setTimeout(() => {
      for (const node of waiting) node.style.animationPlayState = "running";
    }, 900);
    return () => {
      observer.disconnect();
      window.clearTimeout(release);
    };
  }, [pathname]);

  return (
    <div key={pathname} ref={ref} className="page-enter">
      {children}
    </div>
  );
}
