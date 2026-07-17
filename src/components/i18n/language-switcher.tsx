"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { localeCookieName, type Locale } from "@/lib/i18n/messages";

export function LanguageSwitcher({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { tr: string; en: string; label: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem(localeCookieName, nextLocale);
    document.documentElement.lang = nextLocale;
    startTransition(() => router.refresh());
  }

  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-[#d3d9cf] bg-white px-2 text-sm text-[#65705f]">
      <span className="sr-only">{labels.label}</span>
      <select
        aria-label={labels.label}
        disabled={pending}
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        className="bg-transparent text-sm font-medium outline-none"
      >
        <option value="tr">{labels.tr}</option>
        <option value="en">{labels.en}</option>
      </select>
    </label>
  );
}
