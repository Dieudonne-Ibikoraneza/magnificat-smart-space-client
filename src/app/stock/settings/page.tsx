"use client";

import { StockPageHeader } from "@/app/stock/layout";
import { AccountProfileForm } from "@/components/account-profile-form";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";

const StockSettingsPage = () => {
  return (
    <div className="mx-auto max-w-300">
      <StockPageHeader title="Account Settings" subtitle="Manage your profile and account preferences." />

      <div className="mt-6 sm:mt-8">
        <AccountProfileForm />
      </div>

      <section className="mt-5 rounded-3xl bg-white p-6 sm:p-8 lg:px-10 lg:py-9">
        <h2 className="text-lg font-bold text-ink">Account Management</h2>
        <DeleteAccountDialog />
      </section>
    </div>
  );
};

export default StockSettingsPage;
