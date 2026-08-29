"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ChartPie,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  Package,
  Plus,
  Search,
  ShieldCheck,
  UserRoundCog,
  Users,
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "@/components/ui/toast";
import { getVisiblePages } from "@/lib/catalog-utils";
import { usersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/lib/api/use-api";
import { useCurrentUser } from "@/lib/current-user";
import {
  groupDigitsInThrees,
  isValidEmail,
  isValidFullName,
  isValidRwandaMobileDigits,
} from "@/lib/validation";
import { getInitials } from "@/lib/utils";
import type { ApiUser, Role, UserStatus } from "@/lib/api/types";

const PAGE_SIZE = 10;
const RWANDA_PREFIX = "+250";

const STAFF_ROLES: Role[] = ["ADMIN", "SALES_PERSON", "STOCK_MANAGER", "DATA_ANALYST"];

const ROLE_LABELS: Record<Role, string> = {
  CLIENT: "Client",
  ADMIN: "Admin",
  SALES_PERSON: "Sales Person",
  STOCK_MANAGER: "Stock Manager",
  DATA_ANALYST: "Data Analyst",
};

const ROLE_ICONS: Partial<Record<Role, typeof ShieldCheck>> = {
  ADMIN: ShieldCheck,
  SALES_PERSON: Package,
  STOCK_MANAGER: UserRoundCog,
  DATA_ANALYST: ChartPie,
};

const statusFilterOptions: (UserStatus | "ALL")[] = ["ALL", "ACTIVE", "INACTIVE"];
const roleFilterOptions: (Role | "ALL")[] = ["ALL", ...STAFF_ROLES];

const statusBadgeVariant: Record<UserStatus, "primary" | "muted" | "destructive"> = {
  ACTIVE: "primary",
  INACTIVE: "muted",
  SUSPENDED: "destructive",
};

/** Strips a stored "+250780000000" (or any prefix) down to the 9 raw digits the phone field edits. */
const toRwandaDigits = (phone: string | null) => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("250") ? digits.slice(3) : digits.slice(-9);
};

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof ApiError ? cause.message : fallback;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—";

type StaffDraft = { fullName: string; email: string; phone: string; role: Role };
const emptyDraft: StaffDraft = { fullName: "", email: "", phone: "", role: "SALES_PERSON" };

type EditDraft = { fullName: string; phone: string; role: Role };

const PhoneInput = ({ value, onChange }: { value: string; onChange: (digits: string) => void }) => (
  <div className="relative">
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 items-center gap-2 text-sm text-ink"
    >
      {RWANDA_PREFIX}
      <span className="h-4 w-px bg-border" />
    </span>
    <Input
      className="h-11 pr-4 pl-18.5"
      placeholder="780 000 000"
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      value={groupDigitsInThrees(value)}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 9))}
    />
  </div>
);

const RoleSelect = ({ value, onChange }: { value: Role; onChange: (role: Role) => void }) => (
  <Select value={value} onValueChange={(next) => next && onChange(next as Role)}>
    <SelectTrigger className="h-11 w-full border-border">
      <SelectValue>{() => ROLE_LABELS[value]}</SelectValue>
    </SelectTrigger>
    <SelectContent>
      {STAFF_ROLES.map((role) => (
        <SelectItem key={role} value={role}>
          {ROLE_LABELS[role]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const KpiCards = ({ byRole, total }: { byRole: { role: Role; count: number }[]; total: number }) => {
  const kpis = [
    { label: "Total Staff", value: total.toLocaleString(), icon: Users },
    ...STAFF_ROLES.map((role) => {
      const count = byRole.find((row) => row.role === role)?.count ?? 0;
      return {
        label: role === "SALES_PERSON" ? "Sales Team" : role === "STOCK_MANAGER" ? "Stock Managers" : role === "DATA_ANALYST" ? "Data Analysts" : "Administrators",
        value: count,
        percent: total > 0 ? ((count / total) * 100).toFixed(0) : "0",
        icon: ROLE_ICONS[role]!,
      };
    }),
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <article key={kpi.label} className="flex h-full flex-col rounded-2xl bg-card p-5 sm:p-6">
            <Icon className="size-5 stroke-2 text-ink" />
            <div className="mt-4 flex flex-1 flex-col justify-end">
              <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                {kpi.label}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-3xl font-black text-ink">{kpi.value}</p>
                {"percent" in kpi ? (
                  <span className="text-sm font-semibold text-green-600">— {kpi.percent}%</span>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

const StaffManagementPage = () => {
  const { user: currentUser } = useCurrentUser();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof roleFilterOptions)[number]>("ALL");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilterOptions)[number]>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce free-text search so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data: summary, reload: reloadSummary } = useApi(() => usersApi.staffSummary(), []);

  const { data, loading, error, reload } = useApi(
    () =>
      usersApi.listStaff({
        page: currentPage,
        limit: PAGE_SIZE,
        role: roleFilter === "ALL" ? undefined : roleFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search || undefined,
      }),
    [currentPage, roleFilter, statusFilter, search],
  );

  const refreshAll = () => {
    reload();
    reloadSummary();
  };

  const staff = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const totalResults = data?.meta.total ?? 0;
  const showingStart = totalResults === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(currentPage * PAGE_SIZE, totalResults);
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages));

  // --- Add New Staff ---------------------------------------------------------
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<StaffDraft>(emptyDraft);
  const [creating, setCreating] = useState(false);

  const openCreate = () => {
    setCreateDraft(emptyDraft);
    setCreateOpen(true);
  };

  const createValid =
    isValidFullName(createDraft.fullName) &&
    isValidEmail(createDraft.email) &&
    isValidRwandaMobileDigits(createDraft.phone);

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!createValid || creating) return;
    setCreating(true);
    try {
      await usersApi.createStaff({
        fullName: createDraft.fullName.trim(),
        email: createDraft.email.trim(),
        phone: `${RWANDA_PREFIX}${createDraft.phone}`,
        role: createDraft.role,
      });
      toast.success("Staff account created", {
        description: `${createDraft.fullName.trim()} can now sign in with the OTP flow.`,
      });
      setCreateOpen(false);
      setCurrentPage(1);
      refreshAll();
    } catch (cause) {
      toast.error("Couldn't create the staff account", {
        description: errorMessage(cause, "Please check the details and try again."),
      });
    } finally {
      setCreating(false);
    }
  };

  // --- Edit Staff --------------------------------------------------------------
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ fullName: "", phone: "", role: "SALES_PERSON" });
  const [saving, setSaving] = useState(false);

  const openEdit = (member: ApiUser) => {
    setEditing(member);
    setEditDraft({ fullName: member.fullName, phone: toRwandaDigits(member.phone), role: member.role });
  };

  const editValid = isValidFullName(editDraft.fullName) && isValidRwandaMobileDigits(editDraft.phone);

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !editValid || saving) return;
    setSaving(true);
    try {
      await usersApi.updateStaff(editing.id, {
        fullName: editDraft.fullName.trim(),
        phone: `${RWANDA_PREFIX}${editDraft.phone}`,
        role: editDraft.role,
      });
      toast.success("Staff account updated");
      setEditing(null);
      refreshAll();
    } catch (cause) {
      toast.error("Couldn't save changes", {
        description: errorMessage(cause, "Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  // --- View profile --------------------------------------------------------
  const [viewing, setViewing] = useState<ApiUser | null>(null);

  // --- Activate / deactivate --------------------------------------------------
  const [statusTarget, setStatusTarget] = useState<{ staff: ApiUser; next: "ACTIVE" | "INACTIVE" } | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  const confirmStatusChange = async () => {
    if (!statusTarget || changingStatus) return;
    setChangingStatus(true);
    try {
      await usersApi.setStaffStatus(statusTarget.staff.id, statusTarget.next);
      toast.success(
        statusTarget.next === "ACTIVE" ? "Staff account activated" : "Staff account deactivated",
      );
      setStatusTarget(null);
      reload();
    } catch (cause) {
      toast.error("Couldn't update status", { description: errorMessage(cause, "Please try again.") });
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Staff Management"
        subtitle="Manage system users, roles, and administrative access permissions."
      >
        <Button type="button" onClick={openCreate} className="h-11 gap-2 px-5 text-sm font-bold">
          <Plus className="size-[18px]" /> Add New Staff
        </Button>
      </AdminPageHeader>

      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        {summary && <KpiCards byRole={summary.byRole} total={summary.total} />}

        <div className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, email or phone..."
              className="h-11 rounded-lg pl-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0">
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter((value as (typeof roleFilterOptions)[number]) ?? "ALL");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 w-full min-w-0 border-border sm:w-44">
                <SelectValue>{() => (roleFilter === "ALL" ? "Role: All" : `Role: ${ROLE_LABELS[roleFilter as Role]}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roleFilterOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role === "ALL" ? "Role: All" : ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter((value as (typeof statusFilterOptions)[number]) ?? "ALL");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 w-full min-w-0 border-border sm:w-40">
                <SelectValue>{() => (statusFilter === "ALL" ? "Status: All" : `Status: ${statusFilter === "ACTIVE" ? "Active" : "Inactive"}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusFilterOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "ALL" ? "Status: All" : status === "ACTIVE" ? "Status: Active" : "Status: Inactive"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && staff.length === 0 ? (
          <ApiLoading label="Loading staff…" className="rounded-2xl bg-card py-16" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} />
        ) : (
          <section className="overflow-hidden rounded-2xl bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => {
                    const isSelf = member.id === currentUser?.id;
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="min-w-56">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
                              {getInitials(member.fullName)}
                            </span>
                            <span className="truncate text-sm font-semibold text-ink">
                              {member.fullName}
                              {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-ink">{member.email ?? "—"}</TableCell>
                        <TableCell className="font-data whitespace-nowrap text-ink">{member.phone ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-ink">{ROLE_LABELS[member.role]}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[member.status]}>
                            {member.status === "ACTIVE" ? "Active" : member.status === "INACTIVE" ? "Inactive" : "Suspended"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label={`Actions for ${member.fullName}`}
                                  className="rounded-md p-1.5 text-ink hover:bg-secondary"
                                >
                                  <MoreVertical className="size-4" />
                                </button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewing(member)}>View Profile</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(member)}>Edit Staff</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isSelf && member.status === "ACTIVE"}
                                variant={member.status === "ACTIVE" ? "destructive" : "default"}
                                onClick={() =>
                                  setStatusTarget({
                                    staff: member,
                                    next: member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                  })
                                }
                              >
                                {member.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {staff.length === 0 && (
              <ApiEmptyState message="No staff members match your search." className="shadow-none" />
            )}

            {staff.length > 0 && (
              <footer className="flex flex-col gap-4 border-t border-border p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing {showingStart} to {showingEnd} of {totalResults.toLocaleString()} results
                </p>
                <Pagination className="mx-0 w-auto justify-start py-0 sm:justify-end">
                  <PaginationContent className="gap-1 sm:gap-2">
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        size="sm"
                        className="gap-1 text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                        aria-disabled={currentPage === 1}
                        onClick={(event) => {
                          event.preventDefault();
                          goToPage(1);
                        }}
                      >
                        <ChevronsLeft className="size-4" />
                        <span className="hidden sm:inline">First</span>
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        className="text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                        aria-disabled={currentPage === 1}
                        onClick={(event) => {
                          event.preventDefault();
                          goToPage(currentPage - 1);
                        }}
                      />
                    </PaginationItem>
                    {visiblePages.map((page, index) =>
                      page === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis className="text-muted" />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === page}
                            size="icon-sm"
                            className={
                              currentPage === page
                                ? "border-ink bg-ink text-white hover:bg-ink hover:text-white"
                                : "text-ink hover:text-amber"
                            }
                            onClick={(event) => {
                              event.preventDefault();
                              goToPage(page);
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        className="text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                        aria-disabled={currentPage === totalPages}
                        onClick={(event) => {
                          event.preventDefault();
                          goToPage(currentPage + 1);
                        }}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        size="sm"
                        className="gap-1 text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                        aria-disabled={currentPage === totalPages}
                        onClick={(event) => {
                          event.preventDefault();
                          goToPage(totalPages);
                        }}
                      >
                        <span className="hidden sm:inline">Last</span>
                        <ChevronsRight className="size-4" />
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </footer>
            )}
          </section>
        )}
      </div>

      {/* Add New Staff */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={submitCreate}>
            <DialogHeader>
              <DialogTitle>Add New Staff</DialogTitle>
              <DialogDescription>
                No password is set — they sign in with the same OTP flow as clients.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Field>
                <FieldLabel htmlFor="staff-name">Full Name</FieldLabel>
                <Input
                  id="staff-name"
                  className="h-11"
                  value={createDraft.fullName}
                  onChange={(event) => setCreateDraft((draft) => ({ ...draft, fullName: event.target.value }))}
                  placeholder="e.g. Aline Uwase"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-email">Email</FieldLabel>
                <Input
                  id="staff-email"
                  type="email"
                  className="h-11"
                  value={createDraft.email}
                  onChange={(event) => setCreateDraft((draft) => ({ ...draft, email: event.target.value }))}
                  placeholder="name@magnificat.rw"
                />
              </Field>
              <Field>
                <FieldLabel>Phone Number</FieldLabel>
                <PhoneInput
                  value={createDraft.phone}
                  onChange={(phone) => setCreateDraft((draft) => ({ ...draft, phone }))}
                />
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <RoleSelect value={createDraft.role} onChange={(role) => setCreateDraft((draft) => ({ ...draft, role }))} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="h-11 px-5 text-sm font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={!createValid || creating} className="h-11 px-5 text-sm font-bold">
                {creating ? "Creating…" : "Create Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={submitEdit}>
            <DialogHeader>
              <DialogTitle>Edit Staff</DialogTitle>
              <DialogDescription>{editing?.email ?? ""} — email can&apos;t be changed here.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Field>
                <FieldLabel htmlFor="edit-staff-name">Full Name</FieldLabel>
                <Input
                  id="edit-staff-name"
                  className="h-11"
                  value={editDraft.fullName}
                  onChange={(event) => setEditDraft((draft) => ({ ...draft, fullName: event.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel>Phone Number</FieldLabel>
                <PhoneInput
                  value={editDraft.phone}
                  onChange={(phone) => setEditDraft((draft) => ({ ...draft, phone }))}
                />
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <RoleSelect value={editDraft.role} onChange={(role) => setEditDraft((draft) => ({ ...draft, role }))} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} className="h-11 px-5 text-sm font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={!editValid || saving} className="h-11 px-5 text-sm font-bold">
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Profile */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-md">
          {viewing && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-card">
                    {getInitials(viewing.fullName)}
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{viewing.fullName}</DialogTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline">{ROLE_LABELS[viewing.role]}</Badge>
                      <Badge variant={statusBadgeVariant[viewing.status]}>
                        {viewing.status === "ACTIVE" ? "Active" : viewing.status === "INACTIVE" ? "Inactive" : "Suspended"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <dl className="mt-2 space-y-3 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate text-ink">{viewing.email ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-data text-ink">{viewing.phone ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd className="text-ink">{formatDate(viewing.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Last active</dt>
                  <dd className="text-ink">{viewing.lastLoginAt ? formatDate(viewing.lastLoginAt) : "Never signed in"}</dd>
                </div>
              </dl>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewing(null)}
                  className="h-11 px-5 text-sm font-bold"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const target = viewing;
                    setViewing(null);
                    if (target) openEdit(target);
                  }}
                  className="h-11 px-5 text-sm font-bold"
                >
                  Edit Staff
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Activate / deactivate confirmation */}
      <Dialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent className="max-w-sm">
          {statusTarget && (
            <>
              <DialogHeader>
                <span
                  className={`flex size-10 items-center justify-center rounded-full ${
                    statusTarget.next === "INACTIVE" ? "bg-red-50 text-red-600" : "bg-secondary text-ink"
                  }`}
                >
                  <CheckCircle2 className="size-5" />
                </span>
                <DialogTitle className="pt-3">
                  {statusTarget.next === "INACTIVE" ? "Deactivate this account?" : "Activate this account?"}
                </DialogTitle>
                <DialogDescription>
                  {statusTarget.next === "INACTIVE"
                    ? `${statusTarget.staff.fullName} will no longer be able to sign in until reactivated.`
                    : `${statusTarget.staff.fullName} will be able to sign in again.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStatusTarget(null)}
                  className="h-10 px-5 text-sm font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmStatusChange}
                  disabled={changingStatus}
                  className={
                    statusTarget.next === "INACTIVE"
                      ? "h-10 bg-destructive px-5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90"
                      : "h-10 px-5 text-sm font-bold"
                  }
                >
                  {changingStatus ? "Please wait…" : statusTarget.next === "INACTIVE" ? "Deactivate" : "Activate"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StaffManagementPage;
