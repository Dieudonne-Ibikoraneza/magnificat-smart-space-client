import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AccountSettingsPage = () => (
  <div className="mx-auto max-w-4xl">
    <div className="mb-8"><h1 className="text-2xl font-bold text-ink sm:text-3xl">Account Settings</h1><p className="mt-2 text-sm text-muted">Manage your profile and account preferences.</p></div>
    <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-bold text-ink">Personal Information</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-ink">Full name<Input defaultValue="John Doe" /></label>
        <label className="space-y-2 text-sm font-medium text-ink">Email address<Input type="email" defaultValue="john.doe@example.com" /></label>
        <label className="space-y-2 text-sm font-medium text-ink">Phone number<Input defaultValue="+250 780 000 000" /></label>
      </div>
      <Button type="button" className="mt-6 h-11 px-6">Save changes</Button>
    </section>
  </div>
);

export default AccountSettingsPage;

