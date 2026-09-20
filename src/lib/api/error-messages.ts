import { resources } from "@/lib/i18n/resources";

/**
 * Turns an error response from the API into text in the user's language.
 *
 * The API tags every error it raises on purpose with a stable `code` and the
 * `params` it mentions (see the server's `common/errors/app-error.ts`); the
 * matching sentences live in the `apiErrors` section of the locale files. An
 * error without a code — or one this build has no sentence for — falls back to
 * the English message the server sent, so nothing is ever blank.
 */

type Catalog = Record<string, string>;
type FieldError = { field?: string; constraint?: string; message?: string; limit?: number };
export type ApiErrorBody = {
  message?: unknown;
  code?: unknown;
  params?: unknown;
  errors?: unknown;
};

const localeNow = (): "en" | "rw" =>
  typeof document !== "undefined" && document.documentElement.lang === "rw" ? "rw" : "en";

const catalogOf = (locale: "en" | "rw"): Catalog =>
  (resources[locale].common as unknown as { apiErrors: Catalog }).apiErrors;

const humanize = (segment: string) =>
  segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (first) => first.toUpperCase());

const interpolate = (template: string, values: Record<string, unknown>, locale: "en" | "rw"): string => {
  const catalog = catalogOf(locale);
  const common = resources[locale].common as unknown as { staff?: { orderStatus?: Record<string, string> } };
  return template.replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) => {
    if (!(name in values)) return placeholder;
    const value = String(values[name]);
    // A value that is itself a known word (an order status, "floor"/"wall") is shown in the user's language too.
    return common.staff?.orderStatus?.[value] ?? catalog[`term.${value.toLowerCase()}`] ?? value;
  });
};

const fieldLabel = (path: string, locale: "en" | "rw"): string => {
  const last = path.split(".").pop() ?? path;
  return catalogOf(locale)[`field.${last}`] ?? humanize(last);
};

/** The message to show for a failed request. `fallback` is used when the body has nothing usable at all. */
export const translateApiError = (body: unknown, fallback: string, locale: "en" | "rw" = localeNow()): string => {
  if (typeof body === "string") return body || fallback;
  if (!body || typeof body !== "object") return fallback;
  const { message, code, params, errors } = body as ApiErrorBody;
  const catalog = catalogOf(locale);

  if (code === "validation.failed" && Array.isArray(errors) && errors.length > 0) {
    const sentences = (errors as FieldError[]).map((error) => {
      const template = error.constraint ? catalog[`validation.${error.constraint}`] : undefined;
      if (!template || !error.field) return error.message ?? "";
      return interpolate(template, { field: fieldLabel(error.field, locale), limit: error.limit ?? "" }, locale);
    });
    return sentences.filter(Boolean).join(" ");
  }

  if (typeof code === "string" && catalog[code]) {
    return interpolate(catalog[code], (params && typeof params === "object" ? params : {}) as Record<string, unknown>, locale);
  }
  if (typeof message === "string" && message) return message;
  // class-validator returns an array of sentences when a body failed validation and no structure came with it.
  if (Array.isArray(message) && message.length > 0) return message.join(" ");
  return fallback;
};

/** For failures that never reached the server (offline, blocked). */
export const networkErrorMessage = (locale: "en" | "rw" = localeNow()): string => catalogOf(locale)["common.network"];
