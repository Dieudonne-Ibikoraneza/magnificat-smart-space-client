"use client";

import { useTranslation } from "react-i18next";

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  DECLINED: "bg-red-50 text-red-700",
};

export function JourneyQuotationActivity({ detail }: { detail: unknown }) {
  const { t } = useTranslation();
  const quotation = detail && typeof detail === "object"
    ? detail as Record<string, unknown>
    : {};
  const status = typeof quotation.status === "string" && quotation.status in STATUS_STYLES
    ? quotation.status as keyof typeof STATUS_STYLES
    : "PENDING";
  const orderNumber = typeof quotation.orderNumber === "string" ? quotation.orderNumber : null;
  const count = typeof quotation.itemCount === "number" ? quotation.itemCount : 0;

  return (
    <div className="space-y-1.5">
      <p className="font-semibold">
        {t(orderNumber ? "analytics.journey.quotationActivity" : "analytics.journey.quotationActivityWithoutOrder", { orderNumber, count })}
      </p>
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
        {t(`analytics.journey.quotationStatus.${status}`)}
      </span>
    </div>
  );
}
