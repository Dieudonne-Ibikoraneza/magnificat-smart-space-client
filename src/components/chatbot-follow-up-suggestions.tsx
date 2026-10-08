"use client";

import { CornerDownRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Button } from "@/components/ui/button";
import { settingsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

export const ChatbotFollowUpSuggestions = ({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (text: string) => void;
}) => {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useApi(() =>
    settingsApi.followUpQuestions(),
  );
  if (!loading && !error && !data?.length) return null;

  return (
    <section className="mt-8 border-t border-slate-200/70 pt-8">
      <h2 className="text-base font-bold text-ink">
        {t("chatbot.followUpsTitle")}
      </h2>
      {error ? (
        <ApiErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <ApiLoading />
      ) : (
        <div className="mt-3 divide-y divide-slate-200/70">
          {data?.map((question) => (
            <Button
              key={question.id}
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onSelect(question.text);
              }}
              className="h-auto min-h-10 w-full justify-start gap-3 rounded-none px-2 py-2.5 text-left text-xs font-medium whitespace-normal text-muted hover:text-ink sm:text-sm"
            >
              <CornerDownRight className="size-4 shrink-0 text-slate-400" />
              <span className="min-w-0 break-words">{question.text}</span>
            </Button>
          ))}
        </div>
      )}
    </section>
  );
};
