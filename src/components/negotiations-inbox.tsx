"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Loader2,
  MessagesSquare,
  Search,
  Send,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard-page-headers";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cartNegotiationsApi, negotiationInboxApi, ordersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { useCurrentUser } from "@/lib/current-user";
import type { ApiCartNegotiationItem, NegotiationInboxThread, OrderMessageAuthor, Role } from "@/lib/api/types";
import { appendMessageOnce, useNegotiationsInboxFeed, useNegotiationThread } from "@/lib/negotiations-socket";
import { useCursorList } from "@/lib/use-cursor-list";
import { useDebouncedValue } from "@/lib/use-debounced-value";
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
 *
 * The inbox list only ever knows a thread's newest message, so `messages` is
 * just that one message until the conversation has been opened.
 */
type Conversation = {
  /** `kind:id` — the two kinds are separate tables, so an id alone isn't a safe key. */
  key: string;
  id: string;
  kind: "order" | "cart";
  reference: string;
  linkHref?: string;
  customerName: string;
  messages: ThreadMessage[];
  items?: ApiCartNegotiationItem[];
};

/** A conversation as fetched in full when it is opened. */
type FullThread = { messages: ThreadMessage[]; items?: ApiCartNegotiationItem[] };

const threadKey = (kind: "order" | "cart", id: string) => `${kind}:${id}`;

/** Inbox rows per page. */
const PAGE_SIZE = 25;

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const formatRelativeTime = (iso: string, t: (key: string, opts?: Record<string, unknown>) => string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return t("stock.negotiations.justNow");
  if (minutes < 60) return t("stock.negotiations.minutesAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("stock.negotiations.hoursAgo", { count: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return t("stock.negotiations.daysAgo", { count: days });
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const lastMessageOf = (conversation: Conversation) =>
  conversation.messages[conversation.messages.length - 1];

type TFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Which dashboard is showing the inbox. Order threads link to that role's own
 * order page (each area's routes are gated to its role, see `auth-routes.ts`).
 * There is deliberately no data-analyst variant: the backend answers 403 to
 * that role on every negotiation route.
 */
export type NegotiationsArea = "stock" | "admin";

const ORDER_HREF: Record<NegotiationsArea, (orderId: string) => string> = {
  stock: (id) => `/stock/orders/${id}`,
  admin: (id) => `/admin/orders/${id}`,
};

/** The full conversation behind an inbox row — fetched when the row is opened, never up front. */
const fetchThread = async (kind: "order" | "cart", id: string): Promise<FullThread> => {
  if (kind === "order") return { messages: await ordersApi.listMessages(id) };
  const full = await cartNegotiationsApi.get(id);
  return { messages: full.messages, items: full.items };
};

/** An inbox row (plus its full conversation, once loaded) as the list and thread pane render it. Labels are translated here, at render time. */
const buildConversation = (
  row: NegotiationInboxThread,
  full: FullThread | undefined,
  t: TFn,
  area: NegotiationsArea,
): Conversation => ({
  key: threadKey(row.kind, row.id),
  id: row.id,
  kind: row.kind,
  reference:
    row.kind === "order"
      ? t("stock.negotiations.orderRef", { number: row.orderNumber })
      : t("stock.negotiations.preOrderInquiry"),
  linkHref: row.kind === "order" ? ORDER_HREF[area](row.id) : undefined,
  customerName: row.customer.fullName || row.customer.email || t("stock.negotiations.customerFallback"),
  messages: full?.messages ?? [{ ...row.lastMessage, sender: null }],
  items: full?.items,
});

const byLatestActivity = (a: Conversation, b: Conversation) =>
  new Date(lastMessageOf(b).createdAt).getTime() - new Date(lastMessageOf(a).createdAt).getTime();

/**
 * Inbox for negotiation threads — both kinds (an over-stock order, or a cart
 * that never became an order at all): a WhatsApp-style conversation list on
 * the left, the selected thread on the right, matching the same bubble
 * language as the customer-facing negotiation chats. One implementation for
 * the stock manager and admin dashboards. The thread copy is role-neutral, so
 * both read the shared `stock.negotiations.*` strings; only the page
 * title/subtitle are per-area.
 *
 * The list is one paginated, server-searched call (`GET /negotiations/inbox`)
 * — each row carries only the thread's newest message. A conversation's full
 * messages are fetched the first time it is opened and kept live afterwards
 * (socket events), so an inbox load costs one request however many orders
 * exist, instead of one per order.
 */
/**
 * The staff-only note the server leaves when a customer clears their chat view
 * (`CLEARED_NOTE` in cart-negotiations.service.ts). It is stored in English, so
 * it is matched here and shown in the staff member's own language.
 */
const CUSTOMER_CLEARED_NOTE = "The customer cleared their chat view. The earlier conversation is kept here as a record.";

const noteText = (body: string, t: (key: string) => string) =>
  body === CUSTOMER_CLEARED_NOTE ? t("stock.negotiations.customerClearedNote") : body;

export const NegotiationsInbox = ({ area }: { area: NegotiationsArea }) => {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), 300);

  const { data: firstPage, loading, error, reload } = useApi(
    () => negotiationInboxApi.list({ limit: PAGE_SIZE, search: query || undefined }),
    [query],
  );
  const {
    items: rows,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
  } = useCursorList({
    firstPage,
    fetchPage: (cursor) => negotiationInboxApi.list({ cursor, limit: PAGE_SIZE, search: query || undefined }),
    fallbackError: t("stock.negotiations.loadMoreError"),
    getKey: (row) => threadKey(row.kind, row.id),
  });

  // Whether the inbox has ever loaded — from then on the pane stays mounted
  // (so the search box keeps focus) and a new query only swaps the list.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  if (firstPage && !hasLoadedOnce) setHasLoadedOnce(true);

  // Full conversations by thread, fetched the first time a thread is opened.
  const [threads, setThreads] = useState<Record<string, FullThread>>({});
  // Fresher inbox rows pushed by live events, for threads whose conversation isn't loaded.
  const [liveRows, setLiveRows] = useState<Record<string, NegotiationInboxThread>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Remembered so the open conversation survives a search that no longer lists it.
  const [selectedRow, setSelectedRow] = useState<NegotiationInboxThread | null>(null);
  const [threadStatus, setThreadStatus] = useState<{ key: string; error: string | null } | null>(null);
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

  // Every row this inbox knows, live updates layered over the fetched pages.
  // A brand-new thread pushed by a live event is only shown when no search is
  // narrowing the list (it might not match).
  const rowsByKey = useMemo(() => {
    const map = new Map<string, NegotiationInboxThread>();
    for (const row of rows) map.set(threadKey(row.kind, row.id), row);
    for (const [key, row] of Object.entries(liveRows)) {
      if (map.has(key) || !query) map.set(key, row);
    }
    return map;
  }, [rows, liveRows, query]);

  const conversations = useMemo(
    () =>
      [...rowsByKey.values()]
        .map((row) => buildConversation(row, threads[threadKey(row.kind, row.id)], t, area))
        .sort(byLatestActivity),
    [rowsByKey, threads, t, area],
  );

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    const listed = conversations.find((conversation) => conversation.key === selectedKey);
    if (listed) return listed;
    return selectedRow ? buildConversation(selectedRow, threads[selectedKey], t, area) : null;
  }, [selectedKey, selectedRow, conversations, threads, t, area]);

  const selectedLoaded = selected ? !!threads[selected.key] : false;
  const selectedLoadError = selected && threadStatus?.key === selected.key ? threadStatus.error : null;

  const loadThread = async (kind: "order" | "cart", id: string) => {
    const key = threadKey(kind, id);
    setThreadStatus({ key, error: null });
    try {
      const full = await fetchThread(kind, id);
      setThreads((current) => ({ ...current, [key]: full }));
      setThreadStatus((current) => (current?.key === key ? null : current));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("stock.negotiations.toastTryAgain");
      setThreadStatus((current) => (current?.key === key ? { key, error: message } : current));
    }
  };

  const selectThread = (conversation: Conversation) => {
    setSelectedKey(conversation.key);
    setSelectedRow(rowsByKey.get(conversation.key) ?? null);
    if (!threads[conversation.key]) void loadThread(conversation.kind, conversation.id);
  };

  // Switching conversations jumps straight to the bottom, no animation.
  useEffect(() => {
    scrollToBottom("auto");
  }, [selectedKey]);

  // A new message in the open thread — reply, socket echo, the optimistic
  // bubble `sendMessage` appends below, or the conversation finishing its
  // first load — auto-scrolls only if staff is already following the bottom.
  useEffect(() => {
    if (stickToBottomRef.current) scrollToBottom();
  }, [selected?.messages]);

  // A thread getting a new message elsewhere: if its conversation is already
  // loaded, re-pull that one thread; otherwise refresh just its inbox row
  // (a single small request) — never the whole inbox. The open thread is
  // already live via `useNegotiationThread` below, so it's skipped here to
  // avoid a duplicate fetch stepping on the optimistic bubble `sendMessage`
  // just appended.
  useNegotiationsInboxFeed((thread) => {
    const key = threadKey(thread.kind, thread.id);
    if (selectedKey === key) return;
    if (threads[key]) {
      void fetchThread(thread.kind, thread.id)
        .then((full) => setThreads((current) => ({ ...current, [key]: full })))
        .catch(() => undefined);
      return;
    }
    void negotiationInboxApi
      .summary(thread.kind, thread.id)
      .then((row) => setLiveRows((current) => ({ ...current, [key]: row })))
      .catch(() => undefined);
  });

  // Instant delivery into the open thread, on top of the list-level refresh above.
  useNegotiationThread(
    selected ? { kind: selected.kind, id: selected.id } : null,
    (message: ThreadMessage) => {
      if (!selected) return;
      const key = selected.key;
      if (!threads[key]) {
        // Arrived while the conversation is still loading — that fetch may
        // have been issued before this message existed, so fetch again.
        void loadThread(selected.kind, selected.id);
        return;
      }
      if (selected.kind === "cart") {
        // Items can change alongside a message (e.g. "Share my cart"), and
        // the socket payload only ever carries the message itself — refetch
        // the whole thread rather than just appending, so the chips beside it
        // never go stale while staff is watching live.
        void fetchThread("cart", selected.id)
          .then((full) => setThreads((current) => ({ ...current, [key]: full })))
          .catch(() => undefined);
        return;
      }
      setThreads((current) =>
        current[key]
          ? { ...current, [key]: { ...current[key], messages: appendMessageOnce(current[key].messages, message) } }
          : current,
      );
    },
  );

  // Appears in the thread the instant staff hits send — the API call and the
  // socket echo of it happen in the background afterwards. `pendingIds` just
  // dims the bubble until the server confirms it.
  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !selected || !threads[selected.key]) return;
    setDraft("");

    const { id: threadId, kind: threadKind, key } = selected;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: ThreadMessage = {
      id: tempId,
      author: "STAFF",
      senderId: user?.id ?? null,
      sender: user ? { id: user.id, fullName: user.fullName, role: user.role } : null,
      body,
      createdAt: new Date().toISOString(),
    };
    const withMessages = (transform: (messages: ThreadMessage[]) => ThreadMessage[]) =>
      setThreads((current) =>
        current[key] ? { ...current, [key]: { ...current[key], messages: transform(current[key].messages) } } : current,
      );

    stickToBottomRef.current = true;
    setPendingIds((current) => [...current, tempId]);
    withMessages((messages) => [...messages, optimisticMessage]);

    try {
      const message =
        threadKind === "order"
          ? await ordersApi.postMessage(threadId, body)
          : await cartNegotiationsApi.postMessage(threadId, body);
      withMessages((messages) => appendMessageOnce(messages.filter((existing) => existing.id !== tempId), message));
    } catch (cause) {
      withMessages((messages) => messages.filter((existing) => existing.id !== tempId));
      setDraft(body);
      toast.error(t("stock.negotiations.toastNotSentTitle"), {
        description: cause instanceof Error ? cause.message : t("stock.negotiations.toastTryAgain"),
      });
    } finally {
      setPendingIds((current) => current.filter((id) => id !== tempId));
    }
  };

  // No threads at all (not merely none matching a search) — nothing to browse.
  const showEmpty = hasLoadedOnce && !loading && !error && conversations.length === 0 && !search.trim() && !query;

  return (
    <>
      <DashboardPageHeader
        title={t(`${area}.negotiations.title`)}
        subtitle={t(`${area}.negotiations.subtitle`)}
      />
      <div className="mt-6 sm:mt-8">
        {!hasLoadedOnce && loading && <ApiLoading label={t("stock.negotiations.loading")} />}
        {!hasLoadedOnce && !loading && error && <ApiErrorState message={error} onRetry={reload} />}
        {showEmpty && <ApiEmptyState message={t("stock.negotiations.empty")} />}
        {hasLoadedOnce && !showEmpty && (
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
                    placeholder={t("stock.negotiations.searchPlaceholder")}
                    aria-label={t("stock.negotiations.searchAria")}
                    className="h-10 w-full rounded-full border border-border bg-[#F9FAFB] pr-4 pl-10 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              <ul className="flex-1 divide-y divide-border overflow-y-auto">
                {loading ? (
                  <li className="flex justify-center px-4 py-10 text-muted-foreground" aria-label={t("stock.negotiations.loading")}>
                    <Loader2 className="size-5 animate-spin" />
                  </li>
                ) : error ? (
                  <li>
                    <ApiErrorState message={error} onRetry={reload} className="m-3" />
                  </li>
                ) : conversations.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("stock.negotiations.noMatches", { term: search })}
                  </li>
                ) : (
                  <>
                    {conversations.map((conversation) => {
                      const last = lastMessageOf(conversation);
                      const needsReply = last.author !== "STAFF";
                      const isSelected = conversation.key === selectedKey;
                      return (
                        <li key={conversation.key}>
                          <button
                            type="button"
                            onClick={() => selectThread(conversation)}
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
                                  {formatRelativeTime(last.createdAt, t)}
                                </span>
                              </span>
                              <span className="mt-0.5 flex items-center justify-between gap-2">
                                <span
                                  className={cn(
                                    "truncate text-xs text-muted-foreground",
                                    needsReply && "font-semibold text-ink",
                                  )}
                                >
                                  {last.author === "STAFF" ? t("stock.negotiations.you") : ""}
                                  {noteText(last.body, t)}
                                </span>
                                {needsReply && (
                                  <span
                                    className="size-2 shrink-0 rounded-full bg-primary"
                                    aria-label={t("stock.negotiations.awaitingReply")}
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
                    })}
                    {hasMore && (
                      <li className="flex flex-col items-center gap-2 px-4 py-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void loadMore()}
                          disabled={loadingMore}
                          className="h-9 gap-2 px-4 text-xs font-bold"
                        >
                          {loadingMore && <Loader2 className="size-3.5 animate-spin" />}
                          {loadingMore ? t("staff.loading") : t("stock.negotiations.loadMore")}
                        </Button>
                        {loadMoreError && <p className="text-xs text-red-600">{loadMoreError}</p>}
                      </li>
                    )}
                  </>
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
                    {t("stock.negotiations.selectToView")}
                  </p>
                </div>
              ) : (
                <>
                  <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("stock.negotiations.backToConversations")}
                      onClick={() => setSelectedKey(null)}
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
                        {t("stock.negotiations.viewOrder")} <ExternalLink className="size-3.5" />
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
                          {t("stock.negotiations.itemChip", {
                            name: item.productName,
                            area: item.requestedAreaSqm,
                            note: item.availabilityNote,
                          })}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedLoaded ? (
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
                              {noteText(message.body, t)}
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
                  ) : selectedLoadError ? (
                    <div className="flex flex-1 items-center justify-center bg-[#F9FAFB] p-4">
                      <ApiErrorState
                        message={selectedLoadError}
                        onRetry={() => void loadThread(selected.kind, selected.id)}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex flex-1 items-center justify-center bg-[#F9FAFB] text-muted-foreground"
                      aria-label={t("stock.negotiations.loading")}
                    >
                      <Loader2 className="size-6 animate-spin" />
                    </div>
                  )}

                  {showScrollButton && (
                    <button
                      type="button"
                      onClick={() => scrollToBottom()}
                      aria-label={t("stock.negotiations.scrollToLatest")}
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
                      disabled={!selectedLoaded}
                      placeholder={t("stock.negotiations.typeMessage")}
                      aria-label={t("stock.negotiations.messageAria", { name: selected.customerName })}
                      className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => void sendMessage()}
                      disabled={!selectedLoaded || draft.trim() === ""}
                      aria-label={t("stock.negotiations.sendMessage")}
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
