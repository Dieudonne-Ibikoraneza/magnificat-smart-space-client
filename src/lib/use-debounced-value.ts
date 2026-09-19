"use client";

import { useEffect, useState } from "react";

/** `value`, but only once it has stopped changing for `delayMs` — for search boxes that drive a server query. */
export const useDebouncedValue = <T,>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
