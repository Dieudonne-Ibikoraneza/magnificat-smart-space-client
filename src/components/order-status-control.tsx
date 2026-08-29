"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ordersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { OrderStatus } from "@/lib/api/types";

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  READY_FOR_DISPATCH: "Ready for Dispatch",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const statusVariant: Record<OrderStatus, NonNullable<BadgeProps["variant"]>> = {
  PENDING: "outline",
  PROCESSING: "secondary",
  READY_FOR_DISPATCH: "warning",
  SHIPPED: "primary",
  DELIVERED: "muted",
  CANCELLED: "destructive",
};

const statuses: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "READY_FOR_DISPATCH",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

/** Order status badge that doubles as the "Update Status" trigger — click it to change status. */
export const OrderStatusControl = ({
  orderId,
  status,
  onUpdated,
}: {
  orderId: string;
  status: OrderStatus;
  /** Called after a successful status change so the parent can refetch the order. */
  onUpdated: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus>(status);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await ordersApi.updateStatus(orderId, nextStatus, note.trim() || undefined);
      setOpen(false);
      onUpdated();
      toast.success("Order status updated", { description: `Order is now ${statusLabels[nextStatus]}.` });
    } catch (cause) {
      toast.error("Couldn't update status", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setNextStatus(status);
          setNote("");
        }
      }}
    >
      <DialogTrigger render={<button type="button" className="cursor-pointer" aria-label="Update order status" />}>
        <Badge variant={statusVariant[status]} className="inline-flex items-center gap-1">
          {statusLabels[status]}
          <ChevronDown className="size-3" />
        </Badge>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update order status</DialogTitle>
          <DialogDescription>Order #{orderId}</DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-4">
          <Field>
            <FieldLabel htmlFor="order-status">Status</FieldLabel>
            <Select value={nextStatus} onValueChange={(value) => setNextStatus((value as OrderStatus) ?? nextStatus)}>
              <SelectTrigger id="order-status">
                <SelectValue>{(value: string) => statusLabels[value as OrderStatus]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {statusLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="order-status-note">Note (optional)</FieldLabel>
            <Textarea
              id="order-status-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Reason for the change"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="h-10 px-5 text-sm font-bold">
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={submitting} className="h-10 px-5 text-sm font-bold">
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
