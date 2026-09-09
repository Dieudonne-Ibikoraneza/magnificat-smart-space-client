import "i18next";

import type common from "./locales/en/common.json";
import type { DEFAULT_NAMESPACE } from "./resources";

/**
 * Makes `t()` keys type-checked and auto-completed against the English
 * `common.json` (the reference locale). Add a namespace here when you add
 * one to `resources.ts`.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: {
      common: typeof common;
    };
  }
}
