"use client";

import { useTranslation } from "react-i18next";
import { DashboardPageHeader as SalesPageHeader } from "@/components/dashboard-page-headers";
import { AccountProfileForm } from "@/components/account-profile-form";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";

const SalesSettingsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-300">
      <SalesPageHeader title={t("sales.settings.title")} subtitle={t("sales.settings.subtitle")} />

      <div className="mt-6 sm:mt-8">
        <AccountProfileForm />
      </div>

      <section className="mt-5 rounded-3xl bg-white p-6 sm:p-8 lg:px-10 lg:py-9">
        <h2 className="text-lg font-bold text-ink">{t("sales.settings.management")}</h2>
        <DeleteAccountDialog />
      </section>
    </div>
  );
};

export default SalesSettingsPage;
