"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
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

/** Re-checks for a freshly-sent quotation this often, so the prompt shows up without a page reload. */
const POLL_INTERVAL_MS = 2 * 60_000;

/** Session-only, not localStorage: dismissing today's nudge shouldn't silence it forever — it comes back next visit if the order is still unpaid. */
const DISMISSED_KEY = "mss.dismissedQuotationOrderIds";

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

/**
 * Site-wide "your quotation is ready" prompt: the stock team costing an
 * order's delivery and sending its quotation is otherwise silent unless the
 * customer happens to revisit that exact order, so this surfaces it wherever
 * they are in the app instead. Mounted once in the root layout, customers
 * only — staff have their own quotation queue elsewhere and this prompt would
 * make no sense addressed to them.
 */
export const GlobalQuotationDialog = () => {
  const { user } = useCurrentUser();
  const [order, setOrder] = useState<ApiOrder | null>(null);

  const isCustomer = user?.role === "CLIENT";

  useEffect(() => {
    if (!isCustomer) return;

    let active = true;
    const check = async () => {
      try {
        const result = await ordersApi.list({ quotationStatus: "QUOTATION_SENT", limit: 5 });
        if (!active) return;
        const dismissed = new Set(readDismissed());
        setOrder(result.items.find((item) => !dismissed.has(item.id)) ?? null);
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

  if (!isCustomer || !order) return null;

  const dismiss = () => {
    markDismissed(order.id);
    setOrder(null);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/15 text-ink">
            <FileText className="size-5" />
          </span>
          <DialogTitle>Your quotation is ready</DialogTitle>
          <DialogDescription>
            Order {order.orderNumber} has a quotation ready for viewing. Head to the order to see the
            final total and pay.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={dismiss} className="h-10 text-sm font-bold">
            Not now
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={`/account/orders/${order.id}`} />}
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
