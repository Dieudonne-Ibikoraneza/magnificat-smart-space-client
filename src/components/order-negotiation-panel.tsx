"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ordersApi } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import type { ApiOrderMessage, StockShortage } from "@/lib/api/types";
import { appendMessageOnce, useNegotiationThread } from "@/lib/negotiations-socket";
import { cn } from "@/lib/utils";
import { localizeSystemText } from "@/lib/system-text";

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * Inline (not floating) counterpart to `CartNegotiationChat`, for an order that
 * already exists — `orders.service.ts#create` opens this thread automatically
 * the moment part of an order exceeds what's on hand, with a SYSTEM message
 * explaining it. Used two places: right on the order-confirmation screen
 * (`shortages` passed straight from the create response, before any message
 * has necessarily loaded yet), and on the order-detail page (no `shortages`
 * to hand it — it renders once it finds the thread already has messages).
 */
export const OrderNegotiationPanel = ({
  orderId,
  shortages = [],
}: {
  orderId: string;
  shortages?: StockShortage[];
}) => {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [messages, setMessages] = useState<ApiOrderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    ordersApi
      .listMessages(orderId)
      .then((found) => {
        if (active) setMessages(found);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Instant delivery for whatever the stock team (or the customer, from
  // another tab) sends next — `appendMessageOnce` skips this component's own
  // just-sent message, which `sendMessage` below already appended locally.
  useNegotiationThread<ApiOrderMessage>({ kind: "order", id: orderId }, (message) => {
    setMessages((current) => appendMessageOnce(current, message));
  });

  // Appears the instant the customer hits send — the API call and the socket
  // echo of it both happen in the background afterwards. `pendingIds` just
  // dims the bubble until the server confirms it.
  const sendMessage = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: ApiOrderMessage = {
      id: tempId,
      orderId,
      author: "CUSTOMER",
      senderId: user?.id ?? null,
      sender: user ? { id: user.id, fullName: user.fullName, role: user.role } : null,
      body,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setPendingIds((current) => [...current, tempId]);
    setMessages((current) => [...current, optimisticMessage]);

    try {
      const message = await ordersApi.postMessage(orderId, body);
      setMessages((current) => appendMessageOnce(current.filter((existing) => existing.id !== tempId), message));
    } catch (cause) {
      setMessages((current) => current.filter((existing) => existing.id !== tempId));
      setDraft(body);
      toast.error(t("dash.orderNegotiation.toastNotSent"), {
        description: cause instanceof Error ? cause.message : t("dash.tryAgain"),
      });
    } finally {
      setPendingIds((current) => current.filter((id) => id !== tempId));
    }
  };

  // Nothing to show yet: no known shortage and (once loaded) no messages
  // either — e.g. a perfectly normal order with no negotiation history.
  if (!loading && shortages.length === 0 && messages.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {shortages.length > 0 && (
        <div className="flex items-center gap-3 border-b border-slate-100 bg-amber-50 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{t("dash.orderNegotiation.shortageTitle")}</p>
            <p className="text-xs text-muted">
              {shortages.length === 1
                ? t("dash.orderNegotiation.shortageOne", { name: shortages[0].productName, area: shortages[0].requestedAreaSqm })
                : t("dash.orderNegotiation.shortageMany", { count: shortages.length })}
            </p>
          </div>
        </div>
      )}
      {shortages.length === 0 && (
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-ink">{t("dash.orderNegotiation.heading")}</h2>
        </div>
      )}

      <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto bg-[#F9FAFB] px-5 py-4">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted">{t("dash.orderNegotiation.loading")}</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                pendingIds.includes(message.id) && "opacity-60",
                message.author === "CUSTOMER"
                  ? "justify-end"
                  : message.author === "STAFF"
                    ? "justify-start"
                    : "justify-center",
              )}
            >
              {message.author === "SYSTEM" ? (
                <p className="max-w-[85%] rounded-lg bg-amber-100 px-3 py-2 text-center text-xs font-medium text-amber-800">
                  {localizeSystemText(message.body, t)}
                </p>
              ) : (
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                    message.author === "CUSTOMER"
                      ? "rounded-br-sm bg-primary text-ink"
                      : "rounded-bl-sm bg-white text-ink",
                  )}
                >
                  <p className="whitespace-pre-wrap">{localizeSystemText(message.body, t)}</p>
                  <p
                    className={cn(
                      "mt-1 text-right text-[10px]",
                      message.author === "CUSTOMER" ? "text-ink/60" : "text-muted",
                    )}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder={t("dash.orderNegotiation.placeholder")}
          aria-label={t("dash.orderNegotiation.messageAria")}
          className="h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void sendMessage()}
          disabled={draft.trim() === ""}
          aria-label={t("dash.orderNegotiation.sendAria")}
          className="size-11 shrink-0 rounded-full"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </section>
  );
};
