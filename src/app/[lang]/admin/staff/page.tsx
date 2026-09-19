"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
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
import { DashboardPageHeader as AdminPageHeader } from "@/components/dashboard-page-headers";
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

const ROLE_KEYS: Record<Role, string> = {
  CLIENT: "admin.staff.roles.CLIENT",
  ADMIN: "admin.staff.roles.ADMIN",
  SALES_PERSON: "admin.staff.roles.SALES_PERSON",
  STOCK_MANAGER: "admin.staff.roles.STOCK_MANAGER",
  DATA_ANALYST: "admin.staff.roles.DATA_ANALYST",
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

const PhoneInput = ({ value, onChange }: { value: string; onChange: (digits: string) => void }) => {
  const { t } = useTranslation();
  return (
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
      placeholder={t("admin.staff.phonePlaceholder")}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      value={groupDigitsInThrees(value)}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 9))}
    />
  </div>
  );
};

const RoleSelect = ({ value, onChange }: { value: Role; onChange: (role: Role) => void }) => {
  const { t } = useTranslation();
  return (
  <Select value={value} onValueChange={(next) => next && onChange(next as Role)}>
    <SelectTrigger className="h-11 w-full border-border">
      <SelectValue>{() => t(ROLE_KEYS[value])}</SelectValue>
    </SelectTrigger>
    <SelectContent>
      {STAFF_ROLES.map((role) => (
        <SelectItem key={role} value={role}>
          {t(ROLE_KEYS[role])}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  );
};

const KpiCards = ({ byRole, total }: { byRole: { role: Role; count: number }[]; total: number }) => {
  const { t } = useTranslation();
  const kpis = [
    { key: "total", label: t("admin.staff.kpiTotalStaff"), value: total.toLocaleString(), icon: Users },
    ...STAFF_ROLES.map((role) => {
      const count = byRole.find((row) => row.role === role)?.count ?? 0;
      return {
        key: role,
        label:
          role === "SALES_PERSON"
            ? t("admin.staff.kpiSalesTeam")
            : role === "STOCK_MANAGER"
              ? t("admin.staff.kpiStockManagers")
              : role === "DATA_ANALYST"
                ? t("admin.staff.kpiDataAnalysts")
                : t("admin.staff.kpiAdministrators"),
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
          <article key={kpi.key} className="flex h-full flex-col rounded-2xl bg-card p-5 sm:p-6">
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
  const { t } = useTranslation();
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
      toast.success(t("admin.staff.toastCreated"), {
        description: t("admin.staff.toastCreatedDesc", { name: createDraft.fullName.trim() }),
      });
      setCreateOpen(false);
      setCurrentPage(1);
      refreshAll();
    } catch (cause) {
      toast.error(t("admin.staff.toastCreateFailed"), {
        description: errorMessage(cause, t("admin.staff.toastCreateFailedDesc")),
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
      toast.success(t("admin.staff.toastUpdated"));
      setEditing(null);
      refreshAll();
    } catch (cause) {
      toast.error(t("admin.staff.toastUpdateFailed"), {
        description: errorMessage(cause, t("admin.staff.tryAgain")),
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
        statusTarget.next === "ACTIVE" ? t("admin.staff.toastActivated") : t("admin.staff.toastDeactivated"),
      );
      setStatusTarget(null);
      reload();
    } catch (cause) {
      toast.error(t("admin.staff.toastStatusFailed"), { description: errorMessage(cause, t("admin.staff.tryAgain")) });
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t("admin.staff.title")}
        subtitle={t("admin.staff.subtitle")}
      >
        <Button type="button" onClick={openCreate} className="h-11 gap-2 px-5 text-sm font-bold">
          <Plus className="size-[18px]" /> {t("admin.staff.addNewStaff")}
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
              placeholder={t("admin.staff.searchPlaceholder")}
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
                <SelectValue>{() => (roleFilter === "ALL" ? t("admin.staff.roleAll") : t("admin.staff.roleValue", { role: t(ROLE_KEYS[roleFilter as Role]) }))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roleFilterOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role === "ALL" ? t("admin.staff.roleAll") : t(ROLE_KEYS[role])}
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
                <SelectValue>{() => (statusFilter === "ALL" ? t("admin.staff.statusAll") : t("admin.staff.statusValue", { status: t(`staff.userStatus.${statusFilter}`) }))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusFilterOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "ALL" ? t("admin.staff.statusAll") : t("admin.staff.statusValue", { status: t(`staff.userStatus.${status}`) })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && staff.length === 0 ? (
          <ApiLoading label={t("admin.staff.loadingStaff")} className="rounded-2xl bg-card py-16" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} />
        ) : (
          <section className="overflow-hidden rounded-2xl bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.staff.colName")}</TableHead>
                    <TableHead>{t("admin.staff.colEmail")}</TableHead>
                    <TableHead>{t("admin.staff.colPhone")}</TableHead>
                    <TableHead>{t("admin.staff.colRole")}</TableHead>
                    <TableHead>{t("admin.staff.colStatus")}</TableHead>
                    <TableHead>{t("admin.staff.colAction")}</TableHead>
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
                              {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("admin.staff.you")}</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-ink">{member.email ?? t("admin.staff.noValue")}</TableCell>
                        <TableCell className="font-data whitespace-nowrap text-ink">{member.phone ?? t("admin.staff.noValue")}</TableCell>
                        <TableCell className="whitespace-nowrap text-ink">{t(ROLE_KEYS[member.role])}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[member.status]}>
                            {t(`staff.userStatus.${member.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label={t("admin.staff.actionsFor", { name: member.fullName })}
                                  className="rounded-md p-1.5 text-ink hover:bg-secondary"
                                >
                                  <MoreVertical className="size-4" />
                                </button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewing(member)}>{t("admin.staff.viewProfile")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(member)}>{t("admin.staff.editStaff")}</DropdownMenuItem>
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
                                {member.status === "ACTIVE" ? t("admin.staff.deactivate") : t("admin.staff.activate")}
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
              <ApiEmptyState message={t("admin.staff.noStaffMatch")} className="shadow-none" />
            )}

            {staff.length > 0 && (
              <footer className="flex flex-col gap-4 border-t border-border p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {t("admin.staff.showingResults", { start: showingStart, end: showingEnd, total: totalResults.toLocaleString() })}
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
                        <span className="hidden sm:inline">{t("analytics.common.first")}</span>
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
                        <span className="hidden sm:inline">{t("analytics.common.last")}</span>
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
              <DialogTitle>{t("admin.staff.dialogAddTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.staff.dialogAddDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Field>
                <FieldLabel htmlFor="staff-name">{t("admin.staff.fullNameLabel")}</FieldLabel>
                <Input
                  id="staff-name"
                  className="h-11"
                  value={createDraft.fullName}
                  onChange={(event) => setCreateDraft((draft) => ({ ...draft, fullName: event.target.value }))}
                  placeholder={t("admin.staff.fullNamePlaceholder")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-email">{t("admin.staff.emailLabel")}</FieldLabel>
                <Input
                  id="staff-email"
                  type="email"
                  className="h-11"
                  value={createDraft.email}
                  onChange={(event) => setCreateDraft((draft) => ({ ...draft, email: event.target.value }))}
                  placeholder={t("admin.staff.emailPlaceholder")}
                />
              </Field>
              <Field>
                <FieldLabel>{t("admin.staff.phoneLabel")}</FieldLabel>
                <PhoneInput
                  value={createDraft.phone}
                  onChange={(phone) => setCreateDraft((draft) => ({ ...draft, phone }))}
                />
              </Field>
              <Field>
                <FieldLabel>{t("admin.staff.roleLabel")}</FieldLabel>
                <RoleSelect value={createDraft.role} onChange={(role) => setCreateDraft((draft) => ({ ...draft, role }))} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="h-11 px-5 text-sm font-bold">
                {t("admin.staff.cancel")}
              </Button>
              <Button type="submit" disabled={!createValid || creating} className="h-11 px-5 text-sm font-bold">
                {creating ? t("admin.staff.creating") : t("admin.staff.createStaff")}
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
              <DialogTitle>{t("admin.staff.dialogEditTitle")}</DialogTitle>
              <DialogDescription>{t("admin.staff.dialogEditDescription", { email: editing?.email ?? "" })}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Field>
                <FieldLabel htmlFor="edit-staff-name">{t("admin.staff.fullNameLabel")}</FieldLabel>
                <Input
                  id="edit-staff-name"
                  className="h-11"
                  value={editDraft.fullName}
                  onChange={(event) => setEditDraft((draft) => ({ ...draft, fullName: event.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel>{t("admin.staff.phoneLabel")}</FieldLabel>
                <PhoneInput
                  value={editDraft.phone}
                  onChange={(phone) => setEditDraft((draft) => ({ ...draft, phone }))}
                />
              </Field>
              <Field>
                <FieldLabel>{t("admin.staff.roleLabel")}</FieldLabel>
                <RoleSelect value={editDraft.role} onChange={(role) => setEditDraft((draft) => ({ ...draft, role }))} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} className="h-11 px-5 text-sm font-bold">
                {t("admin.staff.cancel")}
              </Button>
              <Button type="submit" disabled={!editValid || saving} className="h-11 px-5 text-sm font-bold">
                {saving ? t("admin.staff.saving") : t("admin.staff.saveChanges")}
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
                      <Badge variant="outline">{t(ROLE_KEYS[viewing.role])}</Badge>
                      <Badge variant={statusBadgeVariant[viewing.status]}>
                        {t(`staff.userStatus.${viewing.status}`)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <dl className="mt-2 space-y-3 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("admin.staff.viewEmail")}</dt>
                  <dd className="truncate text-ink">{viewing.email ?? t("admin.staff.noValue")}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("admin.staff.viewPhone")}</dt>
                  <dd className="font-data text-ink">{viewing.phone ?? t("admin.staff.noValue")}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("admin.staff.viewJoined")}</dt>
                  <dd className="text-ink">{formatDate(viewing.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t("admin.staff.viewLastActive")}</dt>
                  <dd className="text-ink">{viewing.lastLoginAt ? formatDate(viewing.lastLoginAt) : t("admin.staff.neverSignedIn")}</dd>
                </div>
              </dl>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewing(null)}
                  className="h-11 px-5 text-sm font-bold"
                >
                  {t("admin.staff.close")}
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
                  {t("admin.staff.editStaff")}
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
                  {statusTarget.next === "INACTIVE" ? t("admin.staff.deactivateTitle") : t("admin.staff.activateTitle")}
                </DialogTitle>
                <DialogDescription>
                  {statusTarget.next === "INACTIVE"
                    ? t("admin.staff.deactivateDescription", { name: statusTarget.staff.fullName })
                    : t("admin.staff.activateDescription", { name: statusTarget.staff.fullName })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStatusTarget(null)}
                  className="h-10 px-5 text-sm font-bold"
                >
                  {t("admin.staff.cancel")}
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
                  {changingStatus ? t("admin.staff.pleaseWait") : statusTarget.next === "INACTIVE" ? t("admin.staff.deactivate") : t("admin.staff.activate")}
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
