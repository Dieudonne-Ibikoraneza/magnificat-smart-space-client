"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DetailPageHeader, type DetailPageHeaderProps } from "@/components/detail-page-header";
import { PageHeader, type PageHeaderProps } from "@/components/page-header";

type DashboardMenuContextValue = {
  openMenu: () => void;
};

const DashboardMenuContext = createContext<DashboardMenuContextValue | null>(null);

export const DashboardMenuProvider = ({
  children,
  openMenu,
}: {
  children: ReactNode;
  openMenu: () => void;
}) => (
  <DashboardMenuContext.Provider value={{ openMenu }}>
    {children}
  </DashboardMenuContext.Provider>
);

const useDashboardMenu = () => {
  const context = useContext(DashboardMenuContext);
  if (!context) {
    throw new Error("Dashboard page headers must be rendered inside DashboardMenuProvider");
  }
  return context;
};

export const DashboardPageHeader = (props: Omit<PageHeaderProps, "onOpenMenu">) => {
  const { openMenu } = useDashboardMenu();
  return <PageHeader {...props} onOpenMenu={openMenu} />;
};

export const DashboardDetailHeader = (props: Omit<DetailPageHeaderProps, "onOpenMenu">) => {
  const { openMenu } = useDashboardMenu();
  return <DetailPageHeader {...props} onOpenMenu={openMenu} />;
};
