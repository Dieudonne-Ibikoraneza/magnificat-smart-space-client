"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, MapPin, Pencil, Phone, StickyNote, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { DeliveryDetailsDialog } from "@/components/delivery-details-dialog";
import { ordersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { ApiOrderDelivery } from "@/lib/api/types";
import type { DeliveryDetails } from "@/lib/domain-types";

const toDeliveryDetails = (delivery: ApiOrderDelivery): DeliveryDetails => ({
  contactName: delivery.contactName,
  phone: delivery.phone,
  address: delivery.address,
  city: delivery.city,
  preferredDate: delivery.preferredDate ?? undefined,
  notes: delivery.notes ?? undefined,
});

/**
 * Customer-facing delivery-details card: shows what's on file, or a prompt to
 * add it. `locked` disables editing once a quotation has gone out — the
 * transport fee was costed against these exact details, so changing them
 * afterwards would invalidate it without the stock team knowing.
 */
export const DeliveryDetailsCard = ({
  orderId,
  initial,
  locked,
  onSaved,
}: {
  orderId: string;
  initial?: ApiOrderDelivery | null;
  locked?: boolean;
  /** Called with the freshly-saved row, so the parent can update its own order state. */
  onSaved: (delivery: ApiOrderDelivery) => void;
}) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const details = initial ? toDeliveryDetails(initial) : undefined;

  const handleSubmit = async (values: DeliveryDetails) => {
    setSaving(true);
    try {
      const saved = await ordersApi.saveDeliveryDetails(orderId, {
        contactName: values.contactName,
        phone: values.phone,
        address: values.address,
        city: values.city,
        preferredDate: values.preferredDate || undefined,
        notes: values.notes || undefined,
      });
      onSaved(saved);
    } catch (cause) {
      toast.error(t("dash.deliveryCard.toastFailed"), {
        description: cause instanceof ApiError ? cause.message : t("dash.tryAgain"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
            <MapPin className="size-5 text-ink" />
          </span>
          <h2 className="text-lg font-bold text-ink sm:text-xl">{t("dash.deliveryCard.title")}</h2>
        </div>
        {locked ? (
          <span className="text-xs font-medium text-muted">{t("dash.deliveryCard.locked")}</span>
        ) : (
          <DeliveryDetailsDialog
            initialValue={details}
            onSubmit={(values) => void handleSubmit(values)}
            trigger={
              <Button type="button" variant="outline" size="sm" disabled={saving} className="h-8 gap-1.5 text-xs font-bold">
                <Pencil className="size-3.5" /> {details ? t("dash.deliveryCard.edit") : t("dash.deliveryCard.add")}
              </Button>
            }
          />
        )}
      </div>

      {details ? (
        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <User className="mt-0.5 size-4 shrink-0 text-muted" />
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">{t("dash.deliveryCard.contact")}</dt>
              <dd className="text-ink">{details.contactName}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 size-4 shrink-0 text-muted" />
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">{t("dash.deliveryCard.phone")}</dt>
              <dd className="text-ink">{details.phone}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">{t("dash.deliveryCard.address")}</dt>
              <dd className="text-ink">{details.address}, {details.city}</dd>
            </div>
          </div>
          {details.preferredDate && (
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">{t("dash.deliveryCard.preferredDate")}</dt>
                <dd className="text-ink">{details.preferredDate}</dd>
              </div>
            </div>
          )}
          {details.notes && (
            <div className="flex items-start gap-3">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">{t("dash.deliveryCard.notes")}</dt>
                <dd className="text-ink">{details.notes}</dd>
              </div>
            </div>
          )}
        </dl>
      ) : locked ? (
        <p className="mt-4 text-sm text-muted">{t("dash.deliveryCard.noneLocked")}</p>
      ) : (
        <p className="mt-4 text-sm text-muted">{t("dash.deliveryCard.prompt")}</p>
      )}
    </section>
  );
};
