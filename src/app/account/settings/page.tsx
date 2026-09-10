"use client";

import { useTranslation } from "react-i18next";
import { AccountProfileForm } from "@/components/account-profile-form";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";

const AccountSettingsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-300">
      <h1 className="mb-6 text-xl font-bold text-ink sm:text-2xl">{t("dash.settings.title")}</h1>

      <AccountProfileForm />

      <section className="mt-5 rounded-3xl bg-white p-6 sm:p-8 lg:px-10 lg:py-9">
        <h2 className="text-lg font-bold text-ink">{t("dash.settings.management")}</h2>
        <DeleteAccountDialog />
      </section>
    </div>
  );
};

export default AccountSettingsPage;
