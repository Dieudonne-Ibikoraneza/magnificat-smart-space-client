"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { stockLabels } from "@/components/product-card";
import { cn } from "@/lib/utils";
import { cartNegotiationsApi } from "@/lib/api";
import type { ApiCartNegotiation, ApiCartNegotiationMessage } from "@/lib/api/types";
import type { StockShortage } from "@/lib/stock-availability";

const formatSqm = (value: number) => `${value} sqm`;

/**
 * Cart-side counterpart to `StockNegotiationChat`, but real: no order exists
 * yet (the customer couldn't place one), so the thread is persisted against
 * the customer via `cartNegotiationsApi` and reaches the stock manager's
 * negotiations inbox — see `CartNegotiation` in the server schema for why.
 *
 * Only ever shown while the cart currently has a shortage — placing a working
 * order clears the cart, `shortages` empties, and this resets out of view.
 * The thread itself is never deleted though: the stock manager keeps it in
 * their inbox regardless, as a permanent record.
 */
export const CartNegotiationChat = ({ shortages }: { shortages: StockShortage[] }) => {
  const [open, setOpen] = useState(false);
  const [negotiation, setNegotiation] = useState<ApiCartNegotiation | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Rehydrate any existing thread on mount so a reload doesn't lose history —
  // "always there" for the customer as long as the underlying shortage is.
  useEffect(() => {
    let active = true;
    cartNegotiationsApi
      .mine()
      .then((found) => {
        if (active) setNegotiation(found);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [negotiation, open]);

  if (shortages.length === 0 || !hydrated) return null;

  const messages = negotiation?.messages ?? [];

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const alreadyKnown = (item: StockShortage) =>
        negotiation?.items.some(
          (row) => row.productId === item.productId && Number(row.requestedAreaSqm) === item.requestedSqm,
        ) ?? false;
      const newShortages = shortages.filter((item) => !alreadyKnown(item));

      if (!negotiation || newShortages.length > 0) {
        const source = negotiation ? newShortages : shortages;
        const updated = await cartNegotiationsApi.submit(
          source.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            requestedAreaSqm: item.requestedSqm,
            availabilityNote: stockLabels[item.status],
          })),
          body,
        );
        setNegotiation(updated);
      } else {
        const message = await cartNegotiationsApi.postMessage(negotiation.id, body);
        setNegotiation((current) => current && { ...current, messages: [...current.messages, message] });
      }
      setDraft("");
    } catch (cause) {
      toast.error("Message not sent", {
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const bubbleFrom = (message: ApiCartNegotiationMessage) =>
    message.author === "SYSTEM" ? "system" : message.author === "STAFF" ? "staff" : "user";

  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {open ? (
        <div className="flex h-[min(28rem,calc(100dvh-6rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-ink/10 duration-200 animate-in fade-in-0 slide-in-from-bottom-4">
          <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-primary-foreground">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-ink">
                <AlertTriangle className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">Stock Negotiation</p>
                <p className="truncate text-[11px] text-muted">Chat with the stock team</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Minimize chat"
              className="shrink-0 rounded-md p-1 text-white transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <p className="mx-auto max-w-[85%] rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
                {shortages.length === 1
                  ? `${shortages[0].productName}: you're requesting ${formatSqm(shortages[0].requestedSqm)}, more than we currently have. Send a message below to reach our stock team.`
                  : `${shortages.length} items in your cart exceed what's currently in stock. Send a message below to reach our stock team.`}
              </p>
            ) : (
              messages.map((message) => {
                const from = bubbleFrom(message);
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                      from === "user"
                        ? "ml-auto rounded-br-sm bg-primary text-ink"
                        : from === "system"
                          ? "mx-auto rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800"
                          : "rounded-bl-sm bg-secondary text-ink",
                    )}
                  >
                    {message.body}
                  </div>
                );
              })
            )}
            {sending && (
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2.5 text-ink">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              disabled={sending}
              placeholder="Type a message…"
              className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void sendMessage()}
              disabled={draft.trim() === "" || sending}
              aria-label="Send message"
              className="size-10 shrink-0 rounded-full"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open stock negotiation chat"
          className="relative size-14 shrink-0 rounded-full bg-ink text-primary shadow-lg hover:bg-ink/90"
        >
          <MessageCircle className="size-6" />
          <span className="absolute -top-1 -right-1 flex size-4">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
            <span className="relative flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-card">
              {shortages.length}
            </span>
          </span>
        </Button>
      )}
    </div>
  );
};
