"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stockLabels } from "@/components/product-card";
import type { StockShortage } from "@/lib/stock-availability";

type ChatMessage = {
  id: string;
  from: "system" | "staff" | "user";
  text: string;
  /** Out-of-stock system messages read in red instead of the usual amber. */
  severity?: StockShortage["status"];
};

const STAFF_REPLIES = [
  "Thanks for flagging this — let me check what we can allocate from the current batch.",
  "We can release part of that quantity now and ship the remainder once the next batch clears QC, usually within 5–7 days. Would that work for your timeline?",
  "Noted. I'll confirm exact numbers with the warehouse and come back with a revised quotation shortly.",
  "In the meantime, I can suggest a similar in-stock alternative if you'd like to keep the project moving.",
];

const formatSqm = (value: number) => `${value} sqm`;

const shortageKeyOf = (shortages: StockShortage[]) =>
  shortages.map((item) => `${item.productId}:${item.requestedSqm}`).join("|");

/**
 * Floating bottom-right chat launcher for negotiating stock shortfalls with the
 * stock team. Purely client-side simulation: seeds a conversation whenever the
 * set of short-stock items changes, and replies to anything the user sends with
 * a rotating canned staff response after a short delay.
 *
 * It never opens itself — only the launcher bubble's unread badge announces a
 * new shortage. Auto-opening used to cover the order summary and its "Place
 * Order" button on the cart page (worse the shorter the viewport), so opening
 * is left to the customer.
 *
 * `hideExactAvailability` swaps the numeric "28 sqm available" the staff-facing
 * order screens show for a status word ("Low stock" / "Out of stock") — the
 * customer-facing cart passes it, since the precise on-hand count isn't the
 * customer's information to see.
 */
export const StockNegotiationChat = ({
  shortages,
  hideExactAvailability = false,
}: {
  shortages: StockShortage[];
  hideExactAvailability?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [replyIndex, setReplyIndex] = useState(0);
  const [seenKey, setSeenKey] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const shortageKey = shortageKeyOf(shortages);

  if (shortageKey !== seenKey) {
    setSeenKey(shortageKey);
    if (shortages.length > 0) {
      const availabilityPhrase = (item: StockShortage) =>
        hideExactAvailability
          ? `we're currently ${stockLabels[item.status].toLowerCase()} on this one`
          : `only ${item.availableSqm > 0 ? formatSqm(item.availableSqm) : "none"} is available right now`;
      const intro: ChatMessage[] =
        shortages.length === 1
          ? [
              {
                id: `sys-${shortageKey}`,
                from: "system",
                text: `${shortages[0].productName}: you're requesting ${formatSqm(shortages[0].requestedSqm)}, but ${availabilityPhrase(shortages[0])}.`,
                severity: shortages[0].status,
              },
            ]
          : shortages.map((item) => ({
              id: `sys-${item.productId}`,
              from: "system" as const,
              text: hideExactAvailability
                ? `${item.productName}: requesting ${formatSqm(item.requestedSqm)} — currently ${stockLabels[item.status].toLowerCase()}.`
                : `${item.productName}: requesting ${formatSqm(item.requestedSqm)} vs ${item.availableSqm > 0 ? formatSqm(item.availableSqm) : "none"} available.`,
              severity: item.status,
            }));
      setMessages([
        ...intro,
        {
          id: `staff-intro-${shortageKey}`,
          from: "staff",
          text: "Hi, this is the stock team. We can talk through partial fulfillment, a restock timeline, or a similar in-stock alternative — whatever works best for your project.",
        },
      ]);
      setAwaitingReply(false);
    }
  }

  useEffect(() => {
    if (!awaitingReply) return;
    const timeout = window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        { id: `staff-${Date.now()}`, from: "staff", text: STAFF_REPLIES[replyIndex % STAFF_REPLIES.length] },
      ]);
      setReplyIndex((current) => current + 1);
      setAwaitingReply(false);
    }, 1100);
    return () => window.clearTimeout(timeout);
  }, [awaitingReply, replyIndex]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (shortages.length === 0) return null;

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, from: "user", text }]);
    setDraft("");
    setAwaitingReply(true);
  };

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
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  message.from === "user"
                    ? "ml-auto rounded-br-sm bg-primary text-ink"
                    : message.from === "system"
                      ? cn(
                          "mx-auto rounded-lg px-3 py-2 text-center text-xs font-medium",
                          message.severity === "out_of_stock"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-800",
                        )
                      : "rounded-bl-sm bg-secondary text-ink",
                )}
              >
                {message.text}
              </div>
            ))}
            {awaitingReply && (
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
                  sendMessage();
                }
              }}
              placeholder="Type a message…"
              className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <Button
              type="button"
              size="icon"
              onClick={sendMessage}
              disabled={draft.trim() === ""}
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
