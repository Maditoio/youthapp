import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", light ? "text-white" : "text-violet")}>
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-2xl",
          light ? "bg-white/20" : "bg-violet text-white",
        )}
        aria-hidden
      >
        <span className="h-3.5 w-3.5 rounded-md bg-white" />
      </span>
      {compact ? null : <span className="text-lg tracking-wide">JEUNESE</span>}
    </span>
  );
}

export function AreaChart({
  values,
  labels,
  stroke = "#ffffff",
  fill = "rgba(255,255,255,0.28)",
  dot = "#ffffff",
}: {
  values: number[];
  labels?: string[];
  stroke?: string;
  fill?: string;
  dot?: string;
}) {
  const width = 320;
  const height = 128;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - 16 - (value / max) * (height - 36);
    return [x, y] as const;
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(" ");
  const last = points[points.length - 1] ?? [0, height];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full" role="img">
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <line x1={last[0]} x2={last[0]} y1={last[1]} y2={height - 8} stroke={stroke} strokeDasharray="3 4" opacity="0.8" />
      <circle cx={last[0]} cy={last[1]} r="5" fill={dot} />
      {labels ? (
        <g fill="currentColor" fontSize="9" opacity="0.8">
          {labels.map((label, index) => (
            <text key={label} x={(index * step).toFixed(1)} y={height - 1} textAnchor={index === 0 ? "start" : "middle"}>
              {label}
            </text>
          ))}
        </g>
      ) : null}
    </svg>
  );
}

export function OwnershipArt() {
  return (
    <svg viewBox="0 0 360 250" className="mx-auto h-56 w-full max-w-sm" aria-hidden>
      <ellipse cx="180" cy="198" rx="120" ry="28" fill="#5b3df0" opacity="0.35" />
      <path d="M70 176c20 28 200 28 220 0-30 34-190 34-220 0z" fill="#f6c15b" />
      <path d="M92 168c18 18 160 18 176 0-24 20-152 20-176 0z" fill="#ffd56a" />
      <rect x="118" y="78" width="124" height="92" rx="28" fill="#ff8fbe" />
      <rect x="136" y="96" width="36" height="28" rx="8" fill="#fff4f8" />
      <rect x="180" y="96" width="42" height="18" rx="8" fill="#fff4f8" opacity="0.8" />
      <path d="M150 62c18-28 48-28 62 2-20-8-42-6-62-2z" fill="#6d4dff" />
      <circle cx="246" cy="150" r="22" fill="#f6c15b" />
      <circle cx="86" cy="146" r="16" fill="#f6c15b" />
      <text x="246" y="156" textAnchor="middle" fontSize="16" fontWeight="700" fill="#6a4a12">
        $
      </text>
      <text x="86" y="151" textAnchor="middle" fontSize="13" fontWeight="700" fill="#6a4a12">
        $
      </text>
    </svg>
  );
}

export function StatusPill({ children, tone = "violet" }: { children: ReactNode; tone?: "violet" | "green" | "amber" | "red" | "slate" }) {
  const tones = {
    violet: "bg-lilac text-violet",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}
