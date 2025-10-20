export function errorToString(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function isAbortError(err: unknown): boolean {
  if (typeof err === 'object' && err !== null) {
    // `name` is non-standard across some platforms so guard carefully
    const maybe = err as { name?: unknown };
    return maybe.name === 'AbortError';
  }
  return false;
}
