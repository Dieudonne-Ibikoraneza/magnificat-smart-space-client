"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, MessageCircle, Send, Share2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { cartNegotiationsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/current-user";
import type { ApiCartNegotiation, ApiCartNegotiationMessage, StockShortage } from "@/lib/api/types";
import { appendMessageOnce, useNegotiationThread } from "@/lib/negotiations-socket";

/** Exact on-hand quantity, in the note staff see. */
const formatAvailabilityNote = (item: StockShortage) =>
  item.availableAreaSqm > 0 ? `${item.availableAreaSqm} m² available` : "Out of stock";

/** The whole cart, one line per product — what "Share my cart" sends, unlike a shortage message which only ever covers the short lines. */
export type CartLineSummary = {
  productId: string;
  productName: string;
  requestedAreaSqm: number;
  availabilityNote: string;
};

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
export const CartNegotiationChat = ({
  shortages,
  cartItems,
  refreshToken,
}: {
  shortages: StockShortage[];
  /** The customer's whole cart, one line per product — see "Share my cart" below. */
  cartItems: CartLineSummary[];
  /** Bump this when a negotiation may have been opened server-side (see account/cart/page.tsx) to force a refetch. */
  refreshToken?: number;
}) => {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [negotiation, setNegotiation] = useState<ApiCartNegotiation | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Whether to auto-follow new messages to the bottom — true unless the
  // customer has scrolled up to read earlier ones, so an incoming message
  // never yanks them away from what they're reading.
  const stickToBottomRef = useRef(true);
  // Tracks whether the *previous* render had a shortage, so the chat auto-opens
  // exactly on a 0 -> >0 transition — once, not on every re-render while a
  // shortage persists (which would fight a customer who deliberately closed it).
  const hadShortageRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    stickToBottomRef.current = true;
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    stickToBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  };

  // Rehydrate any existing thread on mount so a reload doesn't lose history —
  // "always there" for the customer as long as the underlying shortage is.
  // Also re-runs whenever `refreshToken` bumps: a blocked "Place Order"
  // attempt opens/continues this thread server-side, invisibly to this
  // component's own state, so that's the signal to go fetch it.
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
  }, [refreshToken]);

  // Auto-open the moment a shortage first appears, so the customer isn't
  // left to notice the floating bubble themselves.
  useEffect(() => {
    const hasShortage = shortages.length > 0;
    if (hasShortage && !hadShortageRef.current) setOpen(true);
    hadShortageRef.current = hasShortage;
  }, [shortages.length]);

  useEffect(() => {
    if (!open) return;
    if (stickToBottomRef.current) scrollToBottom();
  }, [negotiation, open]);

  // Instant delivery once a thread exists — `appendMessageOnce` skips this
  // component's own just-sent message, already appended locally below.
  useNegotiationThread<ApiCartNegotiationMessage>(
    negotiation ? { kind: "cart", id: negotiation.id } : null,
    (message) => {
      setNegotiation((current) => current && { ...current, messages: appendMessageOnce(current.messages, message) });
    },
  );

  if (shortages.length === 0 || !hydrated) return null;

  const messages = negotiation?.messages ?? [];

  // Appears the instant the customer hits send — the API call and the socket
  // echo of it both happen in the background afterwards, never blocking the
  // bubble from showing. `pendingIds` just dims it until the server confirms.
  const sendMessage = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: ApiCartNegotiationMessage = {
      id: tempId,
      negotiationId: negotiation?.id ?? "",
      author: "CUSTOMER",
      senderId: user?.id ?? null,
      sender: user ? { id: user.id, fullName: user.fullName, role: user.role } : null,
      body,
      createdAt: new Date().toISOString(),
    };
    stickToBottomRef.current = true;
    setPendingIds((current) => [...current, tempId]);
    setNegotiation((current) =>
      current
        ? { ...current, messages: [...current.messages, optimisticMessage] }
        : {
            id: tempId,
            customerId: user?.id ?? "",
            createdAt: optimisticMessage.createdAt,
            updatedAt: optimisticMessage.createdAt,
            items: [],
            messages: [optimisticMessage],
          },
    );

    try {
      const alreadyKnown = (item: StockShortage) =>
        negotiation?.items.some(
          (row) => row.productId === item.productId && Number(row.requestedAreaSqm) === item.requestedAreaSqm,
        ) ?? false;
      const newShortages = shortages.filter((item) => !alreadyKnown(item));

      if (!negotiation || newShortages.length > 0) {
        const source = negotiation ? newShortages : shortages;
        const updated = await cartNegotiationsApi.submit(
          source.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            requestedAreaSqm: item.requestedAreaSqm,
            availabilityNote: formatAvailabilityNote(item),
          })),
          body,
        );
        setNegotiation(updated);
      } else {
        const message = await cartNegotiationsApi.postMessage(negotiation.id, body);
        setNegotiation(
          (current) =>
            current && {
              ...current,
              messages: appendMessageOnce(
                current.messages.filter((existing) => existing.id !== tempId),
                message,
              ),
            },
        );
      }
    } catch (cause) {
      setNegotiation((current) => current && { ...current, messages: current.messages.filter((m) => m.id !== tempId) });
      setDraft(body);
      toast.error("Message not sent", {
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setPendingIds((current) => current.filter((id) => id !== tempId));
    }
  };

  /** Pushes the whole current cart into the thread as a fresh update — unlike a typed message, which only reports newly-short lines, this always sends every line so staff see exactly what's in the cart right now. */
  const shareCart = async () => {
    if (cartItems.length === 0 || sharing) return;
    setSharing(true);
    stickToBottomRef.current = true;
    try {
      const updated = await cartNegotiationsApi.submit(cartItems, "Here's my current cart.");
      setNegotiation(updated);
    } catch (cause) {
      toast.error("Couldn't share your cart", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSharing(false);
    }
  };

  /** Deletes this thread outright — a fresh start, not an archive. */
  const clearChat = async () => {
    setClearing(true);
    try {
      await cartNegotiationsApi.clearMine();
      setNegotiation(null);
      toast.success("Chat cleared");
    } catch (cause) {
      toast.error("Couldn't clear the chat", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setClearing(false);
    }
  };

  const bubbleFrom = (message: ApiCartNegotiationMessage) =>
    message.author === "SYSTEM" ? "system" : message.author === "STAFF" ? "staff" : "user";

  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {open ? (
        <div className="relative flex h-[min(28rem,calc(100dvh-6rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-ink/10 duration-200 animate-in fade-in-0 slide-in-from-bottom-4">
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
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void shareCart()}
                disabled={sharing || cartItems.length === 0}
                aria-label="Share my cart with the stock team"
                title="Share my cart with the stock team"
                className="rounded-md p-1 text-white transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <Share2 className="size-4" />
              </button>
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    disabled={clearing || messages.length === 0}
                    aria-label="Clear chat"
                    title="Clear chat"
                    className="rounded-md p-1 text-white transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                }
                title="Clear this chat?"
                description="This deletes the whole conversation with our stock team — it can't be undone. You can always start a new one."
                confirmLabel="Clear chat"
                onConfirm={() => void clearChat()}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Minimize chat"
                className="rounded-md p-1 text-white transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div ref={listRef} onScroll={handleScroll} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <p className="mx-auto w-fit max-w-[85%] rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800 break-words">
                {shortages.length === 1
                  ? `${shortages[0].productName}: the full ${shortages[0].requestedAreaSqm} m² requested isn't available right now. Send a message below to reach our stock team.`
                  : `${shortages.length} items in your cart exceed what's currently in stock. Send a message below to reach our stock team.`}
              </p>
            ) : (
              messages.map((message) => {
                const from = bubbleFrom(message);
                const pending = pendingIds.includes(message.id);
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "w-fit max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap",
                      pending && "opacity-60",
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
          </div>

          {showScrollButton && (
            <button
              type="button"
              onClick={() => scrollToBottom()}
              aria-label="Scroll to latest messages"
              className="absolute right-4 bottom-[4.75rem] flex size-9 items-center justify-center rounded-full bg-ink text-white shadow-lg transition-transform hover:scale-105"
            >
              <ChevronDown className="size-4" />
            </button>
          )}

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
              placeholder="Type a message…"
              className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void sendMessage()}
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
          onClick={() => {
            stickToBottomRef.current = true;
            setOpen(true);
          }}
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
