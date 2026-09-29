"use client";

import { useEffect, useRef, useState } from "react";
import { productsApi } from "@/lib/api";

const SKU_CHECK_DEBOUNCE_MS = 400;
export type SkuAvailability = "idle" | "checking" | "available" | "taken" | "error";

/** Debounce typing, ignore stale responses, and allow an immediate check before saving. */
export const useSkuAvailability = (sku: string, formatValid: boolean, excludeId?: string, enabled = true) => {
  const normalizedSku = sku.trim().toUpperCase();
  const [retryToken, setRetryToken] = useState(0);
  const key = `${normalizedSku}:${excludeId ?? ""}:${enabled}:${retryToken}`;
  const [result, setResult] = useState<{ key: string; status: SkuAvailability }>({ key, status: "checking" });
  const generation = useRef(0);
  if (result.key !== key) setResult({ key, status: "checking" });

  useEffect(() => {
    if (!formatValid || !enabled) return;
    let active = true;
    const request = ++generation.current;
    const timer = setTimeout(() => {
      if (!active || request !== generation.current) return;
      productsApi.checkSku(normalizedSku, excludeId).then((response) => {
        if (active && request === generation.current) setResult({ key, status: response.available ? "available" : "taken" });
      }).catch(() => {
        if (active && request === generation.current) setResult({ key, status: "error" });
      });
    }, SKU_CHECK_DEBOUNCE_MS);
    return () => { active = false; clearTimeout(timer); };
  }, [normalizedSku, key, formatValid, excludeId, enabled]);

  const check = async (): Promise<SkuAvailability> => {
    const request = ++generation.current;
    setResult({ key, status: "checking" });
    try {
      const response = await productsApi.checkSku(normalizedSku, excludeId);
      const status = response.available ? "available" : "taken";
      if (request === generation.current) setResult({ key, status });
      return status;
    } catch {
      if (request === generation.current) setResult({ key, status: "error" });
      return "error";
    }
  };

  return {
    status: !formatValid || !enabled ? "idle" as const : result.key === key ? result.status : "checking" as const,
    check,
    retry: () => setRetryToken((token) => token + 1),
    markTaken: () => { generation.current += 1; setResult({ key, status: "taken" }); },
  };
};
