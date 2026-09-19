"use client";

import { useTranslation } from "react-i18next";
import { SessionPending } from "@/components/api-state";
import { useRequireRole } from "@/lib/require-role";
import type { Role } from "@/lib/api/types";

/** Every conversation is now tied to a real account (see `ChatbotService`) —
 * there's no anonymous chat mode left to fall back to, so this gates the
 * whole page to any signed-in role rather than just CLIENT. */
const ANY_AUTHENTICATED_ROLE: Role[] = [
  "CLIENT",
  "SALES_PERSON",
  "STOCK_MANAGER",
  "DATA_ANALYST",
  "ADMIN",
];

const ChatbotLayout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const { authorized } = useRequireRole(ANY_AUTHENTICATED_ROLE);

  // Holds the page until we know who this is — a signed-out visitor gets
  // redirected to /auth by `useRequireRole` itself; this just keeps the chat
  // UI (and the API calls it would otherwise fire) from flashing up first.
  if (!authorized) {
    return (
      <div className="flex h-[calc(100dvh-8.5rem)] items-center justify-center md:h-[calc(100dvh-5rem)]">
        <SessionPending label={t("chatbot.loading")} />
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-2 flex h-[calc(100dvh-8.5rem)] min-h-0 flex-col overflow-hidden sm:-mx-6 sm:-mt-8 md:h-[calc(100dvh-5rem)] lg:-mx-8">
      {children}
    </div>
  );
};

export default ChatbotLayout;
