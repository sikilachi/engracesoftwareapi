export function jget<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
export const jput = (v: unknown) => JSON.stringify(v ?? null);
