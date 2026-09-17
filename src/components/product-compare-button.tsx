"use client";

import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared compare action used by every product-detail surface. */
export const ProductCompareButton = ({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) => {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      variant="outline"
      nativeButton={false}
      render={<Link href={`/compare?ids=${productId}`} />}
      className={cn(
        "group h-auto min-h-16 w-full justify-between rounded-xl border-slate-200 bg-card px-4 py-3 text-left shadow-xs hover:border-amber/50 hover:bg-amber/5",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-amber/10 text-amber">
          <Scale className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink">{t("productDetail.compare")}</span>
          <span className="block truncate text-xs font-medium text-muted">
            {t("productDetail.compareHint")}
          </span>
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink" />
    </Button>
  );
};
