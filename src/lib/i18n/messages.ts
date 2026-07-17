import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];
export type Messages = typeof tr;

export const defaultLocale: Locale = "tr";
export const localeCookieName = "iceberry_locale";

const dictionaries: Record<Locale, Messages> = { tr, en };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "tr" || value === "en";
}

export function messagesFor(locale: string | undefined | null) {
  return dictionaries[isLocale(locale) ? locale : defaultLocale];
}

export function normalizeLocale(locale: string | undefined | null): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

export function translate(locale: string | undefined | null, key: string, fallback?: string) {
  const messages = messagesFor(locale);
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);

  return typeof value === "string" ? value : fallback ?? key;
}
