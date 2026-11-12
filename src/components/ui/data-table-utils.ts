import type { DataTableFilterOption } from "@/components/ui/data-table";

/** Build sorted unique filter options from row values. */
export function uniqueFilterOptions(
  values: Array<string | null | undefined>,
  labelFor?: (value: string) => string,
): DataTableFilterOption[] {
  const unique = [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b),
  );
  return unique.map((value) => ({
    value,
    label: labelFor ? labelFor(value) : value,
  }));
}
