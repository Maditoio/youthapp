const codes = new Map<string, string>();

/** Demo-only plaintext verification codes. They are not written to the database or logs. */
export function stashDemoCode(userId: string, code: string) {
  codes.set(userId, code);
}

export function peekDemoCode(userId: string): string | undefined {
  return codes.get(userId);
}
