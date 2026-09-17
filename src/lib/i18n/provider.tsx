"use client";

import { createInstance, type i18n as I18nInstance } from "i18next";
import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";

import { DEFAULT_LOCALE, type Locale } from "./config";
import { DEFAULT_NAMESPACE, NAMESPACES, resources } from "./resources";

/**
 * Dev only: the translations are bundled into this module, but the i18next
 * instance lives in `I18nProvider`'s state, which Fast Refresh keeps — so a
 * key added to a locale file stayed missing (rendered as the raw key, e.g.
 * `visualizer.viewDetails`) until a full reload. Editing a locale file
 * re-evaluates this module, so the instances created by earlier evaluations
 * are kept on `globalThis` and given the new strings here. Browser only: on
 * the server every request creates an instance, and holding them would leak.
 */
const liveInstances =
  process.env.NODE_ENV !== "production" && typeof window !== "undefined"
    ? ((globalThis as { __mssI18nInstances?: Set<I18nInstance> }).__mssI18nInstances ??= new Set())
    : undefined;

liveInstances?.forEach((instance) => {
  for (const [lng, namespaces] of Object.entries(resources)) {
    for (const [ns, bundle] of Object.entries(namespaces)) {
      instance.addResourceBundle(lng, ns, bundle, true, true);
    }
  }
  // Re-renders everything using `useTranslation`.
  void instance.changeLanguage(instance.language);
});

const createI18n = (locale: Locale): I18nInstance => {
  const instance = createInstance();
  liveInstances?.add(instance);
  // Resources are bundled, so `init` completes synchronously and there is
  // no async backend to await. `useSuspense: false` keeps `useTranslation`
  // from suspending on the (already-resolved) load.
  void instance.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: DEFAULT_NAMESPACE,
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
};

/**
 * Wraps the tree in a React-i18next context. Mounted once in the root
 * layout, inside `<body>`, so the instance survives client-side navigation
 * between areas (account/sales/stock/admin/analytics all share it).
 *
 * `locale` is resolved on the server from the `mss.lang` cookie (see
 * `app/layout.tsx`), so the first render — server and hydration alike — is
 * already in the right language and there is no flash. A dedicated instance
 * per mount (lazy `useState`, not a module singleton) avoids one request's
 * locale bleeding into another's during server rendering.
 *
 * This component owns only the i18next instance and `<html lang>`. Writing
 * the locale back to the cookie is `LocaleSync`'s job on `/[lang]` routes;
 * writing the localStorage "already chosen" flag is only ever done by an
 * explicit pick (the language gate or the switcher, via `lib/i18n/persist`).
 */
export const I18nProvider = ({ locale, children }: { locale: Locale; children: ReactNode }) => {
  const [i18n] = useState(() => createI18n(locale));

  useEffect(() => {
    // Catch the live instance up when the server-resolved locale changes
    // (e.g. after a switcher navigation).
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [i18n, locale]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
