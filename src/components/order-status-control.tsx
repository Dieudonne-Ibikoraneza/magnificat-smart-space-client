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

export type SimpleOrderStatus = "Processing" | "Shipped" | "Delivered";

const statusVariant: Record<SimpleOrderStatus, NonNullable<BadgeProps["variant"]>> = {
  Processing: "secondary",
  Shipped: "primary",
  Delivered: "muted",
};

const statuses: SimpleOrderStatus[] = ["Processing", "Shipped", "Delivered"];

/** Order status badge that doubles as the "Update Status" trigger — click it to change status. */
export const OrderStatusControl = ({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: SimpleOrderStatus;
}) => {
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<SimpleOrderStatus>(initialStatus);
  const [note, setNote] = useState("");

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
          {status}
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
            <Select value={nextStatus} onValueChange={(value) => setNextStatus((value as SimpleOrderStatus) ?? nextStatus)}>
              <SelectTrigger id="order-status">
                <SelectValue>{(value: string) => value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
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
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 px-5 text-sm font-bold">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              setStatus(nextStatus);
              setOpen(false);
              toast.success("Order status updated", { description: `Order ${orderId} is now ${nextStatus}.` });
            }}
            className="h-10 px-5 text-sm font-bold"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
