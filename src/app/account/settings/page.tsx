"use client";

import { AccountProfileForm } from "@/components/account-profile-form";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";

const AccountSettingsPage = () => {
  return (
    <div className="mx-auto max-w-300">
      <h1 className="mb-6 text-xl font-bold text-ink sm:text-2xl">Account Settings</h1>

      <AccountProfileForm />

      <section className="mt-5 rounded-3xl bg-white p-6 sm:p-8 lg:px-10 lg:py-9">
        <h2 className="text-lg font-bold text-ink">Account Management</h2>
        <DeleteAccountDialog />
      </section>
    </div>
  );
};

export default AccountSettingsPage;
