"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/api/client";
import { tokenStore } from "@/lib/api";

export type NegotiationKind = "order" | "cart";
export type NegotiationThread = { kind: NegotiationKind; id: string };
type MessageEvent<T> = NegotiationThread & { message: T };

/**
 * One shared connection for the whole tab, to the same gateway
 * `orders.service.ts#postMessage` / `cart-negotiations.service.ts#postMessage`
 * push to right after persisting a message — see `negotiations.gateway.ts`.
 * Lazily created on first use, not on module load, so a page that never opens
 * a negotiation chat never opens a socket either.
 */
let socket: Socket | null = null;

const getSocket = (): Socket => {
  if (socket) return socket;
  const origin = new URL(API_BASE_URL).origin;
  socket = io(`${origin}/negotiations`, {
    autoConnect: false,
    // A function (not a plain object) so a reconnect after the access token
    // was refreshed sends the current one, not whatever was live at mount.
    auth: (callback) => callback({ token: tokenStore.getAccessToken() }),
  });
  return socket;
};

/**
 * Joins one negotiation thread's room for as long as `thread` is non-null,
 * and calls `onMessage` the instant a new message is pushed to it — the
 * real-time counterpart to polling `listMessages`/reloading after `postMessage`.
 * Pass `null`/`undefined` (e.g. before a cart negotiation exists yet) to stay
 * idle without erroring.
 */
export const useNegotiationThread = <T = unknown>(
  thread: NegotiationThread | null | undefined,
  onMessage: (message: T) => void,
) => {
  // Read through a ref so a caller's inline arrow function doesn't force a
  // rejoin every render — only a genuine change of thread should do that.
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (!thread) return;
    const sock = getSocket();
    if (!sock.connected) sock.connect();
    sock.emit("join", thread);

    const handleMessage = (event: MessageEvent<T>) => {
      if (event.kind === thread.kind && event.id === thread.id) onMessageRef.current(event.message);
    };
    sock.on("message", handleMessage);

    return () => {
      sock.off("message", handleMessage);
      sock.emit("leave", thread);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.kind, thread?.id]);
};

/**
 * Staff-only feed: fires whenever ANY thread anywhere gets a new message, so
 * the negotiations inbox can refresh its list (new/reordered conversations)
 * without polling or joining every thread up front.
 */
export const useNegotiationsInboxFeed = (onThreadUpdated: (thread: NegotiationThread) => void) => {
  const handlerRef = useRef(onThreadUpdated);
  useEffect(() => {
    handlerRef.current = onThreadUpdated;
  });

  useEffect(() => {
    const sock = getSocket();
    if (!sock.connected) sock.connect();

    const handle = (event: NegotiationThread) => handlerRef.current(event);
    sock.on("thread-updated", handle);
    return () => {
      sock.off("thread-updated", handle);
    };
  }, []);
};

/** Appends `message` unless a message with the same `id` is already there — the sender's own optimistic append and the socket echo of that same message would otherwise double up. */
export const appendMessageOnce = <T extends { id: string }>(current: T[], message: T): T[] =>
  current.some((existing) => existing.id === message.id) ? current : [...current, message];
