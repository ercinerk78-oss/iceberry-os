export function searchTerm(value?: string | null) {
  const term = value?.trim();
  return term ? term : undefined;
}

export function phoneDigits(value?: string | null) {
  const digits = value?.replace(/\D/g, "");
  return digits && digits.length >= 3 ? digits : undefined;
}

export function normalizePhone(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

export function normalizeEmail(value?: string | null) {
  return value?.trim().toLocaleLowerCase("tr-TR") ?? "";
}

export function containsInsensitive(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

export function equalsInsensitive(value: string) {
  return { equals: value, mode: "insensitive" as const };
}

export function textSearch<T extends string>(fields: T[], value?: string | null) {
  const term = searchTerm(value);
  if (!term) return undefined;

  return fields.map((field) => ({ [field]: containsInsensitive(term) }));
}
