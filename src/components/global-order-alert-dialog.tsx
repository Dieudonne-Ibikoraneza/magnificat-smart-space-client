"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, PackageCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/current-user";
import { ordersApi } from "@/lib/api";
import type { ApiOrder } from "@/lib/api/types";

/** Re-checks this often, so a prompt shows up without a page reload once the stock team or a restock triggers it. */
const POLL_INTERVAL_MS = 2 * 60_000;

/** Session-only, not localStorage: dismissing today's nudge shouldn't silence it forever — it comes back next visit if the order still needs the customer's attention. */
const DISMISSED_KEY = "mss.dismissedOrderAlertIds";

const readDismissed = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
};

const markDismissed = (id: string) => {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...readDismissed(), id]));
  } catch {
    // Storage unavailable (private browsing) — the dialog just reappears on the next
    // poll instead of staying dismissed, which is harmless.
  }
};

type Alert = { order: ApiOrder; reason: "quotation" | "waitlist" };

const copyFor: Record<Alert["reason"], { icon: typeof FileText; title: string; description: (order: ApiOrder) => string }> = {
  quotation: {
    icon: FileText,
    title: "Your quotation is ready",
    description: (order) =>
      `Order ${order.orderNumber} has a quotation ready for viewing. Head to the order to see the final total and pay.`,
  },
  waitlist: {
    icon: PackageCheck,
    title: "Good news — your order is ready to pay",
    description: (order) =>
      `Enough stock is now available for order ${order.orderNumber} — it's been moved off the waitlist. You have a short window to complete payment before it's released again.`,
  },
};

/**
 * Site-wide "come look at this order" prompt, for the two moments a customer
 * otherwise has to happen to revisit the exact order to notice: the stock
 * team sending its quotation, and a waitlisted order (doc-driven feature, no
 * doc section number yet — see `OrdersService#create`) being promoted once
 * enough stock finally covers it. Mounted once in the root layout, customers
 * only — staff have their own queues elsewhere and this prompt would make no
 * sense addressed to them.
 */
export const GlobalOrderAlertDialog = () => {
  const { user } = useCurrentUser();
  const [alert, setAlert] = useState<Alert | null>(null);

  const isCustomer = user?.role === "CLIENT";

  useEffect(() => {
    if (!isCustomer) return;

    let active = true;
    const check = async () => {
      try {
        const [quotationSent, pending] = await Promise.all([
          ordersApi.list({ quotationStatus: "QUOTATION_SENT", limit: 5 }),
          ordersApi.list({ status: "PENDING", limit: 20 }),
        ]);
        if (!active) return;

        const dismissed = new Set(readDismissed());
        // `quotationStatus` outlives a cancellation (it's a separate field, never
        // reset by `status` changing) — exclude those explicitly rather than
        // relying on the filter alone.
        const stillActive = quotationSent.items.filter((order) => order.status !== "CANCELLED");
        const waitlistPromoted = pending.items.filter(
          (item) => item.waitlistPromotedAt && item.quotationStatus === "AWAITING_REVIEW",
        );

        const candidates: Alert[] = [
          ...stillActive.map((order) => ({ order, reason: "quotation" as const })),
          ...waitlistPromoted.map((order) => ({ order, reason: "waitlist" as const })),
        ];
        setAlert(candidates.find(({ order }) => !dismissed.has(order.id)) ?? null);
      } catch {
        // A failed background check just means no prompt this round — never worth surfacing an error for.
      }
    };

    void check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isCustomer]);

  if (!isCustomer || !alert) return null;

  const dismiss = () => {
    markDismissed(alert.order.id);
    setAlert(null);
  };

  const { icon: Icon, title, description } = copyFor[alert.reason];

  return (
    <Dialog open onOpenChange={(open) => !open && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/15 text-ink">
            <Icon className="size-5" />
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description(alert.order)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={dismiss} className="h-10 text-sm font-bold">
            Not now
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={`/account/orders/${alert.order.id}`} />}
            onClick={dismiss}
            className="h-10 px-5 text-sm font-bold"
          >
            View order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
