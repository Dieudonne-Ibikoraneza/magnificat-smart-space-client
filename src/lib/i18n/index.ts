export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  isLocale,
  localeFromAcceptLanguage,
  localeFromPathname,
  resolveLocale,
  stripLocale,
  withLocale,
  type Locale,
} from "./config";
export { I18nProvider } from "./provider";
export { useLocale } from "./use-locale";

// The strings themselves come from `react-i18next`'s `useTranslation`
// (client components) — no re-export needed here.
