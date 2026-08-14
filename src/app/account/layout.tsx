import { AccountSidebar } from "@/components/account-sidebar";
import { SiteHeader } from "@/components/siteheader";

const AccountLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background text-ink">
    <SiteHeader />
    <div className="flex min-h-[calc(100vh-5rem)] flex-col lg:flex-row">
      <AccountSidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-8 xl:px-10">{children}</main>
    </div>
  </div>
);

export default AccountLayout;

