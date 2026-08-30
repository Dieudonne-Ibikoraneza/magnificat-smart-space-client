"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { groupDigitsInThrees, isValidRwandaMobileDigits } from "@/lib/validation";

export const RWANDA_PREFIX = "+250";

/**
 * Rwandan mobile number field: the "+250" prefix is fixed (not part of what
 * the visitor types or can edit), and the 9 digits after it are grouped into
 * threes as they're typed ("780 000 000") — same shape used at signup
 * (`/auth`), reused wherever else a phone number is collected.
 *
 * `value`/`onChange` deal only in the raw 9 digits, no prefix or spaces —
 * prepend `RWANDA_PREFIX` yourself where the full number is needed (e.g.
 * before sending it to the server).
 */
export const PhoneField = ({
  label = "Phone Number",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (digits: string) => void;
}) => {
  const [touched, setTouched] = useState(false);
  const valid = isValidRwandaMobileDigits(value);
  const showError = touched && value.length > 0 && !valid;

  return (
    <Field className="gap-1.5">
      <FieldLabel className="text-sm font-medium text-ink">{label}</FieldLabel>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2 text-sm text-ink"
        >
          {RWANDA_PREFIX}
          <span className="h-4 w-px bg-border" />
        </span>
        <Input
          className="h-11 pl-18.5 pr-10 text-sm"
          placeholder="780 000 000"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={groupDigitsInThrees(value)}
          aria-invalid={showError}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 9))}
          onBlur={() => setTouched(true)}
        />
        {valid && (
          <CheckCircle2
            aria-hidden="true"
            className="absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-green-600"
            strokeWidth={2}
          />
        )}
      </div>
      {showError && (
        <p className="text-xs font-medium text-red-600">Enter a valid 9-digit phone number.</p>
      )}
    </Field>
  );
};

/** Strips a stored `+250XXXXXXXXX` (or `250XXXXXXXXX`) number down to its bare 9 digits, for `PhoneField`'s `value`. */
export const toRwandaDigits = (phone: string): string =>
  phone.replace(/^\+?250/, "").replace(/\D/g, "").slice(0, 9);
