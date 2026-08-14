import { SiteHeader } from "@/components/siteheader";

const SiteLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-ink">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-360 min-h-0 flex-1 flex-col px-4 py-2 sm:px-6 sm:pt-8 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default SiteLayout;
