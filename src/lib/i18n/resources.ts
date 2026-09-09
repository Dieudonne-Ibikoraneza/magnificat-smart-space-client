import common_en from "./locales/en/common.json";
import common_rw from "./locales/rw/common.json";

/**
 * All translation strings, bundled at build time (no HTTP backend). Keeping
 * them in the bundle keeps `useTranslation` synchronous — no loading state,
 * no suspense — at the cost of shipping both locales to every client. That
 * is fine at this size; revisit with a lazy backend if the files grow large.
 *
 * One namespace (`common`) for now. Add a namespace by creating
 * `locales/<lang>/<ns>.json`, importing it here, and listing it in `NAMESPACES`.
 */
export const DEFAULT_NAMESPACE = "common";
export const NAMESPACES = [DEFAULT_NAMESPACE] as const;

export const resources = {
  en: { common: common_en },
  rw: { common: common_rw },
} as const;
