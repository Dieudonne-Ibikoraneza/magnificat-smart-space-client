"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { usersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/current-user";

/**
 * "Personal Profile" section shared by every role's Account Settings page —
 * the fields and the save/cancel behaviour are identical across roles, only
 * the surrounding page header differs.
 */
export const AccountProfileForm = () => {
  const { user, loading, refresh } = useCurrentUser();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Tracks which user's data the form fields currently hold, so a change in
  // `user` (first load, or after `refresh()` following a save) can be
  // synced into local state during render instead of via an effect.
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

  if (user && user.id !== syncedUserId) {
    setSyncedUserId(user.id);
    setFullName(user.fullName);
  }

  const nameValid = fullName.trim().length >= 2;

  const handleSave = async () => {
    if (!user || !nameValid) return;
    setSaving(true);
    try {
      const updated = await usersApi.updateMe({ fullName: fullName.trim() });
      setFullName(updated.fullName);
      refresh();
      setSaved(true);
      toast.success("Profile updated", { description: "Your changes were saved." });
    } catch (cause) {
      toast.error("Couldn't save changes", {
        description: cause instanceof ApiError ? cause.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!user) return;
    setFullName(user.fullName);
    setSaved(false);
  };

  if (loading || !user) {
    return (
      <section className="rounded-3xl bg-white p-6 sm:p-8 lg:px-10 lg:py-9">
        <h2 className="text-lg font-bold text-ink">Personal Profile</h2>
        <div className="mt-7 grid gap-x-4 gap-y-7 sm:grid-cols-2">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full max-w-1/2 rounded-lg" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-6 sm:p-8 lg:px-10 lg:py-9">
      <h2 className="text-lg font-bold text-ink">Personal Profile</h2>
      <div className="mt-7 grid gap-x-4 gap-y-7 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-medium uppercase text-muted">
          Full names
          <Input
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              setSaved(false);
            }}
            className="h-11 rounded-lg px-4 text-sm normal-case text-ink"
          />
          {fullName.length > 0 && !nameValid && (
            <p className="text-xs font-medium normal-case text-red-600">At least 2 characters.</p>
          )}
        </label>
        <label className="space-y-1.5 text-xs font-medium uppercase text-muted">
          Email address
          <Input
            value={user.email ?? ""}
            disabled
            type="email"
            className="h-11 rounded-lg px-4 text-sm normal-case text-ink disabled:opacity-70"
          />
          <span className="block text-[11px] font-normal normal-case text-muted-foreground">
            Tied to sign-in — can&apos;t be changed here.
          </span>
        </label>
        <label className="space-y-1.5 text-xs font-medium uppercase text-muted sm:max-w-[calc(50%-8px)]">
          Phone number
          <Input
            value={user.phone ?? "—"}
            disabled
            type="tel"
            className="h-11 rounded-lg px-4 text-sm normal-case text-ink disabled:opacity-70"
          />
          <span className="block text-[11px] font-normal normal-case text-muted-foreground">
            Verified at sign-up — contact an administrator to change it.
          </span>
        </label>
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={!nameValid || saving}
          className="h-11 gap-2 px-6 text-sm font-bold disabled:opacity-60"
        >
          <Save className="size-[18px]" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={saving}
          className="h-11 gap-2 px-6 text-sm font-bold text-ink hover:bg-slate-50 hover:text-ink"
        >
          <X className="size-[18px]" /> Cancel
        </Button>
        {saved && <p className="self-center text-sm font-medium text-green-700">Changes saved.</p>}
      </div>
    </section>
  );
};
