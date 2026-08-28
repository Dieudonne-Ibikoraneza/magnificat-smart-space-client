"use client";

import { useState } from "react";
import { CalendarClock, MapPin, Pencil, Phone, StickyNote, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryDetailsDialog } from "@/components/delivery-details-dialog";
import type { DeliveryDetails } from "@/data/order-workflow";

/** Customer-facing delivery-details card: shows what's on file, or a prompt to add it. */
export const DeliveryDetailsCard = ({ initial }: { initial?: DeliveryDetails }) => {
  const [details, setDetails] = useState(initial);

  return (
    <section className="rounded-2xl bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
            <MapPin className="size-5 text-ink" />
          </span>
          <h2 className="text-lg font-bold text-ink sm:text-xl">Delivery Details</h2>
        </div>
        <DeliveryDetailsDialog
          initialValue={details}
          onSubmit={setDetails}
          trigger={
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-bold">
              <Pencil className="size-3.5" /> {details ? "Edit" : "Add"}
            </Button>
          }
        />
      </div>

      {details ? (
        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <User className="mt-0.5 size-4 shrink-0 text-muted" />
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">Contact</dt>
              <dd className="text-ink">{details.contactName}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 size-4 shrink-0 text-muted" />
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">Phone</dt>
              <dd className="text-ink">{details.phone}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">Address</dt>
              <dd className="text-ink">{details.address}, {details.city}</dd>
            </div>
          </div>
          {details.preferredDate && (
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">Preferred date</dt>
                <dd className="text-ink">{details.preferredDate}</dd>
              </div>
            </div>
          )}
          {details.notes && (
            <div className="flex items-start gap-3">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted uppercase">Notes</dt>
                <dd className="text-ink">{details.notes}</dd>
              </div>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Add your delivery address and contact so the stock team can prepare an accurate quotation.
        </p>
      )}
    </section>
  );
};
