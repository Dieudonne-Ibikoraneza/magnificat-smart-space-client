"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, SESSION_CHANGED_EVENT, tokenStore, usersApi } from "@/lib/api";
import type { ApiUser } from "@/lib/api/types";

type CurrentUserState = {
  /**
   * `null` once loading is false means "signed out" — never a loading
   * placeholder — unless `error` is set, which means the check itself failed
   * (network down, API 5xx) and says nothing about whether anyone is signed in.
   */
  user: ApiUser | null;
  loading: boolean;
  /** The session check couldn't complete. Not "signed out": don't redirect, offer `refresh` as a retry. */
  error: boolean;
  /** Re-checks who's signed in — call after login/logout so every consumer updates together. */
  refresh: () => void;
};

const CurrentUserContext = createContext<CurrentUserState | null>(null);

type InternalState = { generation: number; user: ApiUser | null; loading: boolean; error: boolean };

/**
 * The single fetch of "who is this?" for the whole app, done once here
 * instead of every layout and header calling `usersApi.me()` on its own.
 * Mounted once in the root layout so it survives client-side navigation
 * between areas (account/sales/stock/admin/analytics all share it).
 */
export const CurrentUserProvider = ({ children }: { children: ReactNode }) => {
  const [generation, setGeneration] = useState(0);

  // `state.generation` lagging behind `generation` means a `refresh()` just
  // landed — reset to loading for the new round trip. Adjusting state during
  // render like this (rather than in an effect) is the cheaper, endorsed way
  // to react to an input that just changed; see `useApi`'s `key` for the
  // same pattern.
  const [state, setState] = useState<InternalState>({ generation, user: null, loading: true, error: false });
  if (state.generation !== generation) {
    setState({ generation, user: null, loading: true, error: false });
  }

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      // After a page load the access token only exists once the refresh cookie
      // has been exchanged for one — until then "no token" would wrongly read
      // as "signed out".
      await tokenStore.ready();
      const token = tokenStore.getAccessToken();
      if (!token) {
        // No token is "signed out" only when the restore came back with a
        // definite answer. If it couldn't reach the API the session is still
        // there, just unconfirmed — reporting that as signed out would bounce
        // someone with a perfectly good session to /auth over a network blip.
        const unconfirmed = tokenStore.getState() === "unknown";
        if (active) setState((current) => ({ ...current, user: null, loading: false, error: unconfirmed }));
        return;
      }

      try {
        const me = await usersApi.me();
        if (active) setState((current) => ({ ...current, user: me, loading: false, error: false }));
      } catch (cause) {
        if (cause instanceof ApiError && cause.isUnauthorized) {
          // The session itself is dead. Dropping the token makes "no token" a
          // reliable signal everywhere else — `useRequireRole` in particular
          // trusts a present token to mean "still checking," so one left
          // behind would wait forever.
          tokenStore.clear();
          if (active) setState((current) => ({ ...current, user: null, loading: false, error: false }));
          return;
        }
        // A network error or a 5xx says nothing about the session: keep it
        // (token, cookie and hint alike) and surface a retryable error rather
        // than presenting the user as signed out.
        if (active) setState((current) => ({ ...current, user: null, loading: false, error: true }));
      }
    };

    void checkSession();

    return () => {
      active = false;
    };
  }, [generation]);

  const refresh = useCallback(() => setGeneration((value) => value + 1), []);

  // The session can change underneath the app: a background API call's own
  // refresh attempt can fail (the session was revoked or expired) long after
  // this provider's initial check passed, or another tab can sign in or out.
  // Re-running the session check on it is what lets `useRequireRole` see
  // "signed out" and redirect to `/auth`, instead of the app quietly throwing
  // "Unauthorized" on every subsequent request.
  useEffect(() => {
    const onSessionChanged = () => refresh();
    window.addEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, onSessionChanged);
  }, [refresh]);

  // A failed check retries by itself once the browser reports connectivity is back.
  const failed = state.error;
  useEffect(() => {
    if (!failed) return;
    window.addEventListener("online", refresh);
    return () => window.removeEventListener("online", refresh);
  }, [failed, refresh]);

  return (
    <CurrentUserContext.Provider value={{ user: state.user, loading: state.loading, error: state.error, refresh }}>
      {children}
    </CurrentUserContext.Provider>
  );
};

export const useCurrentUser = () => {
  const context = useContext(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  return context;
};
