"use client";

import { useState } from "react";
import { Save, Trash2, X } from "lucide-react";
import { StockPageHeader } from "@/app/stock/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialProfile = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+250 788 123 456",
};

const StockSettingsPage = () => {
  const [profile, setProfile] = useState(initialProfile);
  const [saved, setSaved] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountDeleted, setAccountDeleted] = useState(false);

  const updateProfile = (field: keyof typeof profile, value: string) => {
    setSaved(false);
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const saveChanges = () => setSaved(true);

  const cancelChanges = () => {
    setProfile(initialProfile);
    setSaved(false);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmation("");
  };

  const confirmDeletion = () => {
    if (deleteConfirmation !== "Delete") return;
    setAccountDeleted(true);
    closeDeleteDialog();
  };

  return (
    <div className="mx-auto max-w-300">
      <StockPageHeader title="Account Settings" subtitle="Manage your profile and account preferences." />

      <section className="mt-6 rounded-3xl bg-white p-6 sm:mt-8 sm:p-8 lg:px-10 lg:py-9">
        <h2 className="text-lg font-bold text-ink">Personal Profile</h2>
        <div className="mt-7 grid gap-x-4 gap-y-7 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium uppercase text-muted">
            Full names
            <Input value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} className="h-11 rounded-lg px-4 text-sm normal-case text-ink" />
          </label>
          <label className="space-y-1.5 text-xs font-medium uppercase text-muted">
            Email address
            <Input value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} type="email" className="h-11 rounded-lg px-4 text-sm normal-case text-ink" />
          </label>
          <label className="space-y-1.5 text-xs font-medium uppercase text-muted sm:max-w-[calc(50%-8px)]">
            Phone number
            <Input value={profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} type="tel" className="h-11 rounded-lg px-4 text-sm normal-case text-ink" />
          </label>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={saveChanges} className="h-11 gap-2 px-6 text-sm font-bold"><Save className="size-[18px]" /> Save Changes</Button>
          <Button type="button" variant="outline" onClick={cancelChanges} className="h-11 gap-2 px-6 text-sm font-bold text-ink hover:bg-slate-50 hover:text-ink"><X className="size-[18px]" /> Cancel</Button>
          {saved && <p className="self-center text-sm font-medium text-green-700">Changes saved.</p>}
        </div>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-6 sm:p-8 lg:px-10 lg:py-9">
        <h2 className="text-lg font-bold text-ink">Account Management</h2>
        <div className="mt-5 rounded-lg border border-red-200 p-5 sm:p-6">
          <h3 className="text-lg font-bold text-ink">Account Deletion</h3>
          <p className="mt-3 max-w-5xl text-sm leading-5 text-muted">Deleting your account is permanent. All your data, including order history and saved projects, will be removed from our systems and cannot be recovered.</p>
          {!accountDeleted ? (
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(true)} className="mt-5 h-12 gap-3 border-red-500 px-5 text-base font-bold text-red-500 hover:border-red-600 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-5" /> Delete Account</Button>
          ) : <p className="mt-5 text-sm font-semibold text-red-600">Account deletion requested.</p>}
        </div>
      </section>

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="stock-delete-dialog-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="stock-delete-dialog-title" className="text-xl font-bold text-ink">Delete account?</h2>
                <p className="mt-2 text-sm leading-5 text-muted">This action is permanent. Your account, order history, favorites, and saved designs will be removed.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeDeleteDialog} aria-label="Close delete account dialog" className="size-8 shrink-0"><X className="size-5" /></Button>
            </div>
            <label className="mt-6 block text-sm font-semibold text-ink">Type <span className="text-red-500">Delete</span> to confirm<Input autoFocus value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Delete" className="mt-2 h-12" /></label>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeDeleteDialog} className="h-11 px-5 text-sm font-bold text-ink">Cancel</Button>
              <Button type="button" variant="destructive" disabled={deleteConfirmation !== "Delete"} onClick={confirmDeletion} className="h-11 px-5 text-sm font-bold">Delete account</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockSettingsPage;
