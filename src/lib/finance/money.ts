import { Prisma } from "@prisma/client";

export const zero = new Prisma.Decimal(0);

export function decimal(value: Prisma.Decimal.Value | null | undefined) {
  return new Prisma.Decimal(value ?? 0);
}

export function money(value: Prisma.Decimal.Value | null | undefined, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "TRY" || currency === "EUR" || currency === "USD" ? 2 : 4,
  }).format(decimal(value).toNumber());
}

export function percent(value: Prisma.Decimal.Value | null | undefined) {
  return `%${decimal(value).toNumber().toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
}

export function nextNumber(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
