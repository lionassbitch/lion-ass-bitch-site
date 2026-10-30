/**
 * Deterministic JSON serialization: object keys sorted recursively, arrays in
 * order, no whitespace. Used for every digest so that the same record always
 * hashes to the same value regardless of how it was assembled.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v === undefined) continue;
      out[key] = sortValue(v);
    }
    return out;
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}
