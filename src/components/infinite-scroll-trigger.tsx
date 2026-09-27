"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export const InfiniteScrollTrigger = ({
  hasMore,
  loading,
  onLoadMore,
  className = "py-3",
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = triggerRef.current;
    if (!node || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore && !loading) return null;
  return (
    <div
      ref={triggerRef}
      role={loading ? "status" : undefined}
      className={`flex items-center justify-center ${className}`}
    >
      {loading && (
        <span className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          {t("common.loading")}
        </span>
      )}
    </div>
  );
};
