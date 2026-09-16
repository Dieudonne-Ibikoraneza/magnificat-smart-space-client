import { LOCALE_COOKIE, LOCALE_STORAGE_KEY, type Locale } from "./config";

/**
 * Client-side persistence of the chosen locale, kept out of any component or
 * hook body so the `document.cookie` / `localStorage` writes read as the
 * plain browser-API calls they are.
 *
 * Two layers:
 * - the **cookie** is what `src/proxy.ts` and the server read to route and
 *   render in the right language;
 * - the **localStorage** copy is the "has the visitor picked yet?" flag the
 *   first-visit language gate checks — only an explicit choice sets it.
 */
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const persistLocaleCookie = (locale: Locale): void => {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${ONE_YEAR_SECONDS};samesite=lax`;
};

export const persistLocaleChoice = (locale: Locale): void => {
  persistLocaleCookie(locale);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Site data blocked — the cookie still carries the choice; the gate may
    // reappear on the next visit, which is acceptable.
  }
};

export const readLocaleChoice = (): string | null => {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
};
