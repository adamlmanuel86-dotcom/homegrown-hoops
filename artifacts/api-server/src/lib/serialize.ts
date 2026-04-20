export function serializeRow<T extends Record<string, unknown>>(row: T): T {
  const result = { ...row } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (result[key] instanceof Date) {
      result[key] = (result[key] as Date).toISOString();
    }
  }
  return result as T;
}

export function serializeRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map(serializeRow);
}
