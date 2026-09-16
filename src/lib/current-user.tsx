"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { SESSION_EXPIRED_EVENT, tokenStore, usersApi } from "@/lib/api";
import type { ApiUser } from "@/lib/api/types";

type CurrentUserState = {
  /** `null` once loading is false means "signed out" — never a loading placeholder. */
  user: ApiUser | null;
  loading: boolean;
  /** Re-checks who's signed in — call after login/logout so every consumer updates together. */
  refresh: () => void;
};

const CurrentUserContext = createContext<CurrentUserState | null>(null);

type InternalState = { generation: number; user: ApiUser | null; loading: boolean };

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
  const [state, setState] = useState<InternalState>({ generation, user: null, loading: true });
  if (state.generation !== generation) {
    setState({ generation, user: null, loading: true });
  }

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const token = tokenStore.getAccessToken();
      if (!token) {
        if (active) setState((current) => ({ ...current, user: null, loading: false }));
        return;
      }

      try {
        const me = await usersApi.me();
        if (active) setState((current) => ({ ...current, user: me, loading: false }));
      } catch {
        // An expired/invalid token: not signed in, not an error to surface
        // here. Clearing it makes "no token" a reliable signal everywhere
        // else — `useRequireRole` in particular trusts a present token to
        // mean "still checking," so a dead one left behind would wait forever.
        tokenStore.clear();
        if (active) setState((current) => ({ ...current, user: null, loading: false }));
      }
    };

    void checkSession();

    return () => {
      active = false;
    };
  }, [generation]);

  const refresh = useCallback(() => setGeneration((value) => value + 1), []);

  // A background API call's own refresh attempt can fail (the refresh token
  // itself expired/was revoked) long after this provider's initial check
  // passed — that's the one signal nothing else here would ever notice on
  // its own. Re-running the session check on it is what lets `useRequireRole`
  // see "signed out" and redirect to `/auth`, instead of the app quietly
  // throwing "Unauthorized" on every subsequent request.
  useEffect(() => {
    const onSessionExpired = () => refresh();
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [refresh]);

  return (
    <CurrentUserContext.Provider value={{ user: state.user, loading: state.loading, refresh }}>
      {children}
    </CurrentUserContext.Provider>
  );
};

export const useCurrentUser = () => {
  const context = useContext(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  return context;
};
