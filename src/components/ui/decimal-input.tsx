"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { isDecimalInput } from "@/lib/product-validation";

/** Numeric editing shared by product creation and editing, including paste and mobile input. */
export const DecimalInput = ({ value, onChange, onKeyDown, onPaste, ...props }: Omit<ComponentProps<typeof Input>, "value" | "type"> & { value: string }) => (
  <Input
    {...props}
    type="text"
    inputMode="decimal"
    spellCheck={false}
    value={value}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      const input = event.currentTarget;
      const next = value.slice(0, input.selectionStart ?? value.length) + event.key + value.slice(input.selectionEnd ?? value.length);
      if (!isDecimalInput(next)) event.preventDefault();
    }}
    onPaste={(event) => {
      onPaste?.(event);
      if (event.defaultPrevented) return;
      const input = event.currentTarget;
      const next = value.slice(0, input.selectionStart ?? value.length) + event.clipboardData.getData("text") + value.slice(input.selectionEnd ?? value.length);
      if (!isDecimalInput(next)) event.preventDefault();
    }}
    onChange={(event) => {
      if (!isDecimalInput(event.target.value)) {
        event.target.value = value;
        return;
      }
      onChange?.(event);
    }}
  />
);
