import type { ReactNode } from "react";

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
