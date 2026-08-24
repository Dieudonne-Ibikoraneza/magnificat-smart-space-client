"use client";

import { useState } from "react";
import {
  Bell,
  Eye,
  GripVertical,
  ListChecks,
  Lightbulb,
  MessageSquareWarning,
  Plus,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ProfilingQuestion = {
  id: string;
  text: string;
  status: string;
  conditional?: boolean;
};

const profilingQuestions: ProfilingQuestion[] = [
  { id: "q1", text: "What is your primary goal for using this space today?", status: "Required" },
  { id: "q2", text: "How any people are in your group?", status: "Required" },
  { id: "q3", text: "What is the approximate size of the space?", status: "Required" },
  { id: "q4", text: "What is the primary wall paint color?", status: "Required" },
  { id: "q5", text: "What is the dominant color of your large furniture?", status: "Living Room", conditional: true },
  { id: "q6", text: "What style are the interior doors?", status: "Living Room", conditional: true },
  { id: "q7", text: "Are there predominantly wooden or glass tables?", status: "Living Room", conditional: true },
  { id: "q8", text: "What is the style of your window curtains/blinds?", status: "Living Room", conditional: true },
  { id: "q9", text: "What material are the accent chairs?", status: "Living Room", conditional: true },
];

const aiRecommendationStats = [
  { label: "Questions Used", value: profilingQuestions.length, icon: MessageSquareWarning },
  { label: "Required Questions", value: profilingQuestions.filter((q) => q.status === "Required").length, icon: MessageSquareWarning },
  { label: "Conditional Questions", value: profilingQuestions.filter((q) => q.conditional).length, icon: ListChecks },
];

const notificationToggles = [
  { key: "lowStock", label: "Low Stock Alerts" },
  { key: "orderUpdates", label: "Order Updates" },
  { key: "systemNotifications", label: "System Notifications" },
] as const;

const platformInfo = [
  { label: "Platform Name", value: "Magnificat Smart Space" },
  { label: "Default Currency", value: "RWF (Rwandan Franc)" },
  { label: "System Version", value: "v2.4.1" },
];

const AiRecommendations = () => (
  <section className="rounded-2xl bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-ink">
          <Lightbulb className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink">AI Recommendations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage AI recommendation logic and customer profiling questions.
          </p>
        </div>
      </div>
      <Button type="button" variant="outline" className="h-10 shrink-0 gap-2 border-border text-ink">
        <Plus className="size-4" /> Add Question
      </Button>
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-3">
      {aiRecommendationStats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article key={stat.label} className="rounded-xl border border-border p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted-background text-ink">
              <Icon className="size-5" />
            </span>
            <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p className="mt-1 text-3xl font-black text-ink">{stat.value}</p>
          </article>
        );
      })}
    </div>

    <div className="mt-5 -mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            <th className="pb-3 pr-4 font-bold">Question</th>
            <th className="pb-3 pr-4 font-bold whitespace-nowrap">Status/Condition</th>
            <th className="pb-3 font-bold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profilingQuestions.map((question, index) => (
            <tr key={question.id} className="border-b border-border last:border-0">
              <td className="py-4 pr-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                  <span className="w-6 shrink-0 font-data text-sm font-semibold text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("text-sm text-ink", question.conditional && "flex items-center gap-1.5")}>
                    {question.conditional && <span className="text-muted-foreground">↳</span>}
                    {question.text}
                  </span>
                </div>
              </td>
              <td className="py-4 pr-4 whitespace-nowrap">
                <Badge variant={question.status === "Required" ? "default" : "outline"}>
                  {question.status}
                </Badge>
              </td>
              <td className="py-4 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <button type="button" aria-label={`Preview question ${index + 1}`} className="rounded-md p-1.5 text-ink hover:bg-secondary">
                    <Eye className="size-4" />
                  </button>
                  <button type="button" aria-label={`Edit question ${index + 1}`} className="rounded-md p-1.5 text-ink hover:bg-secondary">
                    <Wrench className="size-4" />
                  </button>
                  <button type="button" aria-label={`Delete question ${index + 1}`} className="rounded-md p-1.5 text-red-600 hover:bg-red-50">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const SystemSettingsPage = () => {
  const [lowStockNotifications, setLowStockNotifications] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    lowStock: true,
    orderUpdates: true,
    systemNotifications: true,
  });

  return (
    <>
      <AdminPageHeader
        title="System Settings"
        subtitle="Configure core platform settings and preferences."
      >
        <div className="flex flex-col items-end gap-1.5">
          <Button type="button" className="h-11 gap-2 px-5 text-sm font-bold">
            <Save className="size-[18px]" /> Save All Changes
          </Button>
          <p className="text-xs text-muted-foreground">Last synced: Just Now</p>
        </div>
      </AdminPageHeader>

      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <AiRecommendations />

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-2">
          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">Inventory Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage stock-related preferences</p>

            <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Low Stock Notifications</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Alert when items fall below threshold</p>
              </div>
              <Switch
                checked={lowStockNotifications}
                onCheckedChange={setLowStockNotifications}
                aria-label="Toggle low stock notifications"
              />
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <label className="block text-sm font-semibold text-ink">
                Low Stock Threshold
                <div className="mt-2 flex items-center overflow-hidden rounded-lg border border-input">
                  <Input
                    type="number"
                    min={0}
                    value={lowStockThreshold}
                    onChange={(event) => setLowStockThreshold(event.target.value)}
                    className="h-11 rounded-none border-0 text-sm"
                  />
                  <span className="shrink-0 px-3 text-sm text-muted-foreground">units</span>
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-ink" />
              <h2 className="text-lg font-bold text-ink">Notifications</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Manage system notification preferences</p>

            <div className="mt-2 divide-y divide-border">
              {notificationToggles.map((toggle) => (
                <div key={toggle.key} className="flex items-center justify-between gap-4 py-4">
                  <p className="text-sm font-semibold text-ink">{toggle.label}</p>
                  <Switch
                    checked={notifications[toggle.key]}
                    onCheckedChange={(checked) =>
                      setNotifications((current) => ({ ...current, [toggle.key]: checked }))
                    }
                    aria-label={`Toggle ${toggle.label}`}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 px-1 sm:grid-cols-3">
          {platformInfo.map((item) => (
            <div key={item.label}>
              <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-bold text-ink">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SystemSettingsPage;
