"use client";

import { CircleSlash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { ApiProduct } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function InventoryProductFlags({
  product,
  className,
}: {
  product: Pick<ApiProduct, "isActive">;
  className?: string;
}) {
  const { t } = useTranslation();
  if (product.isActive) return null;
  return (
    <Badge
      variant="muted"
      className={cn(
        "inline-flex gap-1.5 border-slate-200 bg-slate-100 text-slate-600",
        className,
      )}
    >
      <CircleSlash aria-hidden="true" className="size-3.5" />
      {t("stock.inventory.inactive")}
    </Badge>
  );
}
