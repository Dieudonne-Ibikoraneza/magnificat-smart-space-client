"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { isLocale, type Locale } from "@/lib/i18n/config";
import { persistLocaleCookie } from "@/lib/i18n/persist";

/**
 * Renders nothing. Keeps the shared i18next instance, the `<html lang>`
 * attribute, and the `mss.lang` cookie in step with the `/[lang]` URL
 * segment — the segment is the source of truth on these routes, so a link
 * shared with an explicit `/rw/…` prefix loads in Kinyarwanda even if the
 * visitor's cookie still said `en`.
 *
 * It deliberately does not write the localStorage copy of the choice: that
 * key is the "has the visitor picked a language yet?" flag the language
 * gate reads, and only an explicit pick (the gate or the switcher) sets it.
 */
export const LocaleSync = ({ locale }: { locale: Locale }) => {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!isLocale(locale)) return;
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    persistLocaleCookie(locale);
  }, [i18n, locale]);

  return null;
};
