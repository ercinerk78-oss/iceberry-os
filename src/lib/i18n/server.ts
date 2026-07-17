import { cookies } from "next/headers";

import { localeCookieName, normalizeLocale, translate } from "@/lib/i18n/messages";

export async function getLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(localeCookieName)?.value);
}

export async function getTranslations() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: string, fallback?: string) => translate(locale, key, fallback),
  };
}
