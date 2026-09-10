import "i18next";

import type { DEFAULT_NAMESPACE } from "./resources";

/**
 * `t()` returns a plain `string` and accepts any string key.
 *
 * We deliberately do NOT type `resources` against `common.json`: with ~700
 * keys the generated key union makes TypeScript's `t()` overload resolution
 * blow its instantiation-depth limit (TS2589) wherever a key is looked up
 * from an `as const` map. A missing key just renders its own name at
 * runtime, which surfaces immediately in testing.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    returnNull: false;
  }
}
