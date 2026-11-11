/** Log-safe summary of a database (or any) error: no connection strings, params or row data. */
export function describeDbError(error: unknown): { name: string; message: string; sqlState?: string } {
  if (!(error instanceof Error)) return { name: typeof error, message: String(error).slice(0, 300) };
  const source = error as Error & { sqlState?: unknown; code?: unknown; cause?: { code?: unknown; sqlState?: unknown } };
  const candidates = [source.sqlState, source.cause?.sqlState, source.code, source.cause?.code];
  const sqlState = candidates.find((value): value is string => typeof value === "string" && /^[0-9A-Z]{5}$/.test(value));
  return { name: error.name, message: error.message.slice(0, 300), ...(sqlState ? { sqlState } : {}) };
}
