const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Strict email check: rejects malformed addresses, stray whitespace, control
 * characters, and consecutive dots rather than relying on the loose native
 * `type="email"` validation (which accepts things like "a@b").
 */
export const isValidEmail = (value: string): boolean => {
  const email = value.trim();
  if (!email || email.length > 254) return false;
  if (email.includes("..")) return false;
  if (/[\x00-\x1f\x7f<>"();]/.test(email)) return false;
  return EMAIL_PATTERN.test(email);
};

const NAME_PATTERN = /^[\p{L}][\p{L}' -]{1,79}$/u;

/** Requires a first and last name, letters/spaces/hyphens/apostrophes only. */
export const isValidFullName = (value: string): boolean => {
  const name = value.trim().replace(/\s+/g, " ");
  if (!NAME_PATTERN.test(name)) return false;
  return name.includes(" ");
};

const PHONE_PATTERN = /^\+?[1-9]\d{6,14}$/;

/** Accepts international numbers with optional spaces/dashes, 7-15 digits. */
export const isValidPhone = (value: string): boolean => {
  const digits = value.trim().replace(/[\s-]/g, "");
  return PHONE_PATTERN.test(digits);
};

/** Rwandan mobile numbers: 9 digits after the +250 prefix, starting with 7. */
export const isValidRwandaMobileDigits = (digits: string): boolean => /^7\d{8}$/.test(digits);

/** Groups digits into chunks of 3 for display, e.g. "780000000" -> "780 000 000". */
export const groupDigitsInThrees = (digits: string): string =>
  (digits.match(/.{1,3}/g) ?? []).join(" ");
