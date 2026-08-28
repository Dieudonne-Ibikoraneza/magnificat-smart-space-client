"use client";

import { Headset, Mail, MessageCircle, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type OrderSupportReason = "edit" | "stuck";

const copy: Record<OrderSupportReason, { title: string; description: string }> = {
  edit: {
    title: "Need to change this order?",
    description:
      "Once an order has been submitted it can no longer be edited directly here, to keep the quotation and stock allocation accurate. Our customer support team can make the change for you.",
  },
  stuck: {
    title: "Order not moving forward?",
    description:
      "If this order seems stuck or you haven't heard back yet, our customer support team can check its status with the stock team and follow up with you directly.",
  },
};

const channels = [
  { icon: Phone, label: "Call us", value: "+250 788 300 400", href: "tel:+250788300400" },
  { icon: Mail, label: "Email us", value: "support@magnificatsmartspace.rw", href: "mailto:support@magnificatsmartspace.rw" },
  { icon: MessageCircle, label: "WhatsApp", value: "+250 788 300 400", href: "https://wa.me/250788300400" },
];

export const OrderSupportDialog = ({
  reason = "edit",
  trigger,
}: {
  reason?: OrderSupportReason;
  trigger: React.ReactNode;
}) => {
  const { title, description } = copy[reason];

  return (
    <Dialog>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-ink">
            <Headset className="size-5" />
          </span>
          <DialogTitle className="pt-3">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-2.5">
          {channels.map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-ink">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
                <span className="block truncate text-sm font-medium text-ink">{value}</span>
              </span>
            </a>
          ))}
        </div>

        <DialogFooter>
          <p className="text-xs text-muted-foreground sm:mr-auto sm:self-center">
            Our team typically responds within one business hour.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
