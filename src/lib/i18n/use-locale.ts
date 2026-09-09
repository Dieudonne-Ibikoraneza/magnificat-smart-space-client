"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { LOCALES, LOCALE_LABELS, resolveLocale, withLocale, type Locale } from "./config";
import { persistLocaleChoice } from "./persist";

type UseLocale = {
  /** The active locale (always one of `LOCALES`). */
  locale: Locale;
  /** Every locale the app supports, for building a switcher. */
  locales: readonly Locale[];
  /** Each language named in itself, e.g. `rw` -> "Ikinyarwanda". */
  labels: Record<Locale, string>;
  /** Switch language: persist the choice and navigate to the same page under the new prefix. */
  setLocale: (next: Locale) => void;
};

/**
 * The switcher-side companion to `I18nProvider`. On a migrated (`/[lang]/…`)
 * route it swaps the locale segment in the URL and navigates; the new
 * server render then picks the language up from the path. It also writes
 * the `mss.lang` cookie so `src/proxy.ts` keeps sending unprefixed requests
 * to the matching prefix, and so the next visit starts in the same language.
 */
export const useLocale = (): UseLocale => {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  const setLocale = (next: Locale) => {
    if (next === locale) return;
    persistLocaleChoice(next);
    void i18n.changeLanguage(next);
    router.push(withLocale(pathname, next));
  };

  return { locale, locales: LOCALES, labels: LOCALE_LABELS, setLocale };
};
