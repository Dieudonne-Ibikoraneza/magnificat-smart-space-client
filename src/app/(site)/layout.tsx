import { SiteHeader } from "@/components/siteheader";

const SiteLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}

export default SiteLayout;
