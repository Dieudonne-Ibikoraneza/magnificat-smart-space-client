"use client";

import { createContext } from "react";
import type { ApiUser } from "@/lib/api/types";

export type CurrentUserState = {
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

export const CurrentUserContext = createContext<CurrentUserState | null>(null);
