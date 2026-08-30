"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  MessagesSquare,
  Search,
  Send,
} from "lucide-react";
import { StockPageHeader } from "@/app/stock/layout";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cartNegotiationsApi, ordersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { useCurrentUser } from "@/lib/current-user";
import type { ApiCartNegotiationItem, OrderMessageAuthor, Role } from "@/lib/api/types";
import { appendMessageOnce, useNegotiationsInboxFeed, useNegotiationThread } from "@/lib/negotiations-socket";
import { cn } from "@/lib/utils";

/** Shared shape of `ApiOrderMessage` and `ApiCartNegotiationMessage`. */
type ThreadMessage = {
  id: string;
  author: OrderMessageAuthor;
  senderId: string | null;
  sender: { id: string; fullName: string; role: Role } | null;
  body: string;
  createdAt: string;
};

/**
 * One conversation, whichever of the two thread kinds it is:
 * - `order` — negotiated on an existing order (`ordersApi`), opened when the
 *   order itself exceeded stock on hand.
 * - `cart` — negotiated before any order exists (`cartNegotiationsApi`),
 *   because the cart couldn't be placed as one at all; `items` is the
 *   snapshot of what the customer was trying to buy.
 */
type Conversation = {
  id: string;
  kind: "order" | "cart";
  reference: string;
  linkHref?: string;
  customerName: string;
  messages: ThreadMessage[];
  items?: ApiCartNegotiationItem[];
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const formatRelativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const lastMessageOf = (conversation: Conversation) =>
  conversation.messages[conversation.messages.length - 1];

/**
 * Both negotiation kinds are pulled and merged into one inbox:
 * - Order threads: there's no "list my threads" endpoint, so this pulls the
 *   stock manager's most recent orders and keeps only the ones with a
 *   message — normally opened automatically when an order exceeded stock on
 *   hand (`orders.service.ts#create`).
 * - Cart threads: opened when the cart itself couldn't be placed as an order
 *   at all — no order exists, so these are linked to the customer directly
 *   (`cart-negotiations.service.ts`) and listed via its own staff endpoint.
 *
 * Fine for the current volumes; if either list gets large, the natural next
 * step is a backend endpoint that returns threads directly.
 */
const loadConversations = async (): Promise<Conversation[]> => {
  const [{ items: orders }, { items: cartNegotiations }] = await Promise.all([
    ordersApi.list({ limit: 100 }),
    cartNegotiationsApi.list({ limit: 100 }),
  ]);

  const orderThreads = await Promise.all(
    orders.map(async (order) => ({
      order,
      messages: await ordersApi.listMessages(order.id),
    })),
  );

  const conversations: Conversation[] = [
    ...orderThreads
      .filter(({ messages }) => messages.length > 0)
      .map(({ order, messages }): Conversation => ({
        id: order.id,
        kind: "order",
        reference: `Order #${order.orderNumber}`,
        linkHref: `/stock/orders/${order.id}`,
        customerName: order.customer?.fullName || order.customer?.email || "Customer",
        messages,
      })),
    ...cartNegotiations
      .filter((negotiation) => negotiation.messages.length > 0)
      .map((negotiation): Conversation => ({
        id: negotiation.id,
        kind: "cart",
        reference: "Pre-order inquiry",
        customerName: negotiation.customer?.fullName || negotiation.customer?.email || "Customer",
        messages: negotiation.messages,
        items: negotiation.items,
      })),
  ];

  return conversations.sort(
    (a, b) => new Date(lastMessageOf(b).createdAt).getTime() - new Date(lastMessageOf(a).createdAt).getTime(),
  );
};

/**
 * Stock manager inbox for negotiation threads — both kinds (an over-stock
 * order, or a cart that never became an order at all): a WhatsApp-style
 * conversation list on the left, the selected thread on the right, matching
 * the same bubble language as the customer-facing negotiation chats.
 */
const StockNegotiationsPage = () => {
  const { user } = useCurrentUser();
  const { data: conversations, loading, error, reload } = useApi(loadConversations);
  // `items` is only ever present for a cart thread and only set when a
  // refetch (below) actually picked up a fresher snapshot — absent otherwise,
  // so `merged` below falls back to the conversation's own last-known items.
  const [overrides, setOverrides] = useState<Record<string, { messages: ThreadMessage[]; items?: ApiCartNegotiationItem[] }>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Whether to auto-follow new messages to the bottom — true unless staff
  // has scrolled up to read earlier ones, so an incoming message never yanks
  // them away from what they're reading.
  const stickToBottomRef = useRef(true);

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

  const merged = useMemo(
    () =>
      (conversations ?? []).map((conversation) => {
        const override = overrides[conversation.id];
        if (!override) return conversation;
        return { ...conversation, messages: override.messages, items: override.items ?? conversation.items };
      }),
    [conversations, overrides],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...merged].sort(
      (a, b) =>
        new Date(lastMessageOf(b).createdAt).getTime() -
        new Date(lastMessageOf(a).createdAt).getTime(),
    );
    if (!term) return sorted;
    return sorted.filter(
      (conversation) =>
        conversation.customerName.toLowerCase().includes(term) ||
        conversation.reference.toLowerCase().includes(term),
    );
  }, [merged, search]);

  const selected = filtered.find((c) => c.id === selectedId) ?? null;

  // Switching conversations jumps straight to the bottom, no animation.
  useEffect(() => {
    scrollToBottom("auto");
  }, [selectedId]);

  // A new message in the open thread — reply, socket echo, or the optimistic
  // bubble `sendMessage` appends below — auto-scrolls only if staff is
  // already following the bottom.
  useEffect(() => {
    if (stickToBottomRef.current) scrollToBottom();
  }, [selected?.messages]);

  // A thread getting a new message elsewhere just needs its own messages
  // re-pulled (for reordering/preview) — never the whole inbox (list of
  // orders + cart negotiations + every thread's messages, N+1 requests) just
  // to reflect one new line. The open thread is already live via
  // `useNegotiationThread` below, so it's skipped here to avoid a duplicate
  // fetch stepping on the optimistic bubble `sendMessage` just appended.
  // Only a thread this inbox has never seen (a brand-new conversation) still
  // needs the full `reload()`, since there is no per-thread endpoint to
  // create list entries from.
  useNegotiationsInboxFeed((thread) => {
    if (selected && selected.kind === thread.kind && selected.id === thread.id) return;
    const known = (conversations ?? []).some((c) => c.kind === thread.kind && c.id === thread.id);
    if (!known) {
      reload();
      return;
    }
    if (thread.kind === "order") {
      void ordersApi
        .listMessages(thread.id)
        .then((messages) => setOverrides((current) => ({ ...current, [thread.id]: { messages } })))
        .catch(() => undefined);
      return;
    }
    // Cart threads: a full refetch, not just messages — `items` can change
    // alongside a message (e.g. the customer hitting "Share my cart"), and
    // there's no lighter endpoint that returns just the new ones.
    void cartNegotiationsApi
      .get(thread.id)
      .then((full) => setOverrides((current) => ({ ...current, [thread.id]: { messages: full.messages, items: full.items } })))
      .catch(() => undefined);
  });

  // Instant delivery into the open thread, on top of the list-level refresh above.
  useNegotiationThread(
    selected ? { kind: selected.kind, id: selected.id } : null,
    (message: ThreadMessage) => {
      if (!selected) return;
      if (selected.kind === "cart") {
        // Items can change alongside a message (e.g. "Share my cart"), and
        // the socket payload only ever carries the message itself — refetch
        // the whole thread rather than just appending, so the chips beside it
        // never go stale while staff is watching live.
        void cartNegotiationsApi
          .get(selected.id)
          .then((full) => setOverrides((current) => ({ ...current, [selected.id]: { messages: full.messages, items: full.items } })))
          .catch(() => undefined);
        return;
      }
      setOverrides((current) => ({
        ...current,
        [selected.id]: { messages: appendMessageOnce(current[selected.id]?.messages ?? selected.messages, message) },
      }));
    },
  );

  // Appears in the thread the instant staff hits send — the API call and the
  // socket echo of it happen in the background afterwards. `pendingIds` just
  // dims the bubble until the server confirms it.
  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !selected) return;
    setDraft("");

    const { id: selectedId, kind: selectedKind, messages: baseMessages } = selected;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: ThreadMessage = {
      id: tempId,
      author: "STAFF",
      senderId: user?.id ?? null,
      sender: user ? { id: user.id, fullName: user.fullName, role: user.role } : null,
      body,
      createdAt: new Date().toISOString(),
    };
    stickToBottomRef.current = true;
    setPendingIds((current) => [...current, tempId]);
    setOverrides((current) => ({
      ...current,
      [selectedId]: {
        messages: [...(current[selectedId]?.messages ?? baseMessages), optimisticMessage],
        items: current[selectedId]?.items,
      },
    }));

    try {
      const message =
        selectedKind === "order"
          ? await ordersApi.postMessage(selectedId, body)
          : await cartNegotiationsApi.postMessage(selectedId, body);
      setOverrides((current) => ({
        ...current,
        [selectedId]: {
          messages: appendMessageOnce(
            (current[selectedId]?.messages ?? baseMessages).filter((existing) => existing.id !== tempId),
            message,
          ),
          items: current[selectedId]?.items,
        },
      }));
    } catch (cause) {
      setOverrides((current) => ({
        ...current,
        [selectedId]: {
          messages: (current[selectedId]?.messages ?? baseMessages).filter((existing) => existing.id !== tempId),
          items: current[selectedId]?.items,
        },
      }));
      setDraft(body);
      toast.error("Message not sent", {
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setPendingIds((current) => current.filter((id) => id !== tempId));
    }
  };

  return (
    <>
      <StockPageHeader
        title="Negotiations"
        subtitle="Chat with customers whose orders — or carts — exceeded stock on hand."
      />
      <div className="mt-6 sm:mt-8">
        {loading && <ApiLoading label="Loading conversations…" />}
        {!loading && error && <ApiErrorState message={error} onRetry={reload} />}
        {!loading && !error && filtered.length === 0 && merged.length === 0 && (
          <ApiEmptyState message="No negotiation threads yet — they open automatically when an order, or a cart, exceeds stock on hand." />
        )}
        {!loading && !error && merged.length > 0 && (
          <div className="flex h-[calc(100dvh-10rem)] overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5 sm:h-[calc(100dvh-11rem)] lg:h-[calc(100dvh-13rem)]">
            {/* Conversation list */}
            <aside
              className={cn(
                "flex w-full min-w-0 flex-col border-r border-border sm:max-w-80 lg:max-w-96",
                selected && "hidden sm:flex",
              )}
            >
              <div className="shrink-0 border-b border-border p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by customer or order #..."
                    aria-label="Search negotiations"
                    className="h-10 w-full rounded-full border border-border bg-[#F9FAFB] pr-4 pl-10 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <ul className="flex-1 divide-y divide-border overflow-y-auto">
                {filtered.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No matches for &ldquo;{search}&rdquo;.
                  </li>
                ) : (
                  filtered.map((conversation) => {
                    const last = lastMessageOf(conversation);
                    const needsReply = last.author !== "STAFF";
                    const isSelected = conversation.id === selectedId;
                    return (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(conversation.id)}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60",
                            isSelected && "bg-primary/10 hover:bg-primary/10",
                          )}
                        >
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-primary">
                            {getInitials(conversation.customerName)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-bold text-ink">
                                {conversation.customerName}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {formatRelativeTime(last.createdAt)}
                              </span>
                            </span>
                            <span className="mt-0.5 flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "truncate text-xs text-muted-foreground",
                                  needsReply && "font-semibold text-ink",
                                )}
                              >
                                {last.author === "STAFF" ? "You: " : ""}
                                {last.body}
                              </span>
                              {needsReply && (
                                <span
                                  className="size-2 shrink-0 rounded-full bg-primary"
                                  aria-label="Awaiting reply"
                                />
                              )}
                            </span>
                            <span className="mt-1 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                              {conversation.reference}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </aside>

            {/* Thread */}
            <section className={cn("relative flex min-w-0 flex-1 flex-col", !selected && "hidden sm:flex")}>
              {!selected ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <MessagesSquare className="size-6" />
                  </span>
                  <p className="text-sm font-medium text-muted-foreground">
                    Select customer to view chat messages
                  </p>
                </div>
              ) : (
                <>
                  <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Back to conversations"
                      onClick={() => setSelectedId(null)}
                      className="size-9 sm:hidden"
                    >
                      <ArrowLeft className="size-5" />
                    </Button>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-primary">
                      {getInitials(selected.customerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{selected.customerName}</p>
                      <p className="truncate text-xs text-muted-foreground">{selected.reference}</p>
                    </div>
                    {selected.linkHref && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={selected.linkHref} />}
                        className="h-9 shrink-0 gap-1.5 px-3 text-xs font-semibold"
                      >
                        View order <ExternalLink className="size-3.5" />
                      </Button>
                    )}
                  </header>

                  {selected.items && selected.items.length > 0 && (
                    <div className="flex shrink-0 flex-wrap gap-2 border-b border-border bg-[#F9FAFB] px-4 py-3">
                      {selected.items.map((item) => (
                        <span
                          key={item.id}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800"
                        >
                          {item.productName} · {item.requestedAreaSqm} sqm · {item.availabilityNote}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    ref={listRef}
                    onScroll={handleScroll}
                    className="flex-1 space-y-3 overflow-y-auto bg-[#F9FAFB] px-4 py-4"
                  >
                    {selected.messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          pendingIds.includes(message.id) && "opacity-60",
                          message.author === "STAFF"
                            ? "justify-end"
                            : message.author === "CUSTOMER"
                              ? "justify-start"
                              : "justify-center",
                        )}
                      >
                        {message.author === "SYSTEM" ? (
                          <p className="max-w-[85%] rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium break-words text-amber-800">
                            {message.body}
                          </p>
                        ) : (
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                              message.author === "STAFF"
                                ? "rounded-br-sm bg-primary text-ink"
                                : "rounded-bl-sm bg-white text-ink",
                            )}
                          >
                            <p className="break-words whitespace-pre-wrap">{message.body}</p>
                            <p
                              className={cn(
                                "mt-1 text-right text-[10px]",
                                message.author === "STAFF" ? "text-ink/60" : "text-muted-foreground",
                              )}
                            >
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
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

                  <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder="Type a message…"
                      aria-label={`Message ${selected.customerName}`}
                      className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => void sendMessage()}
                      disabled={draft.trim() === ""}
                      aria-label="Send message"
                      className="size-11 shrink-0 rounded-full"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
};

export default StockNegotiationsPage;
