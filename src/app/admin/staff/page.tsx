"use client";

import { useMemo, useState } from "react";
import {
  ChartPie,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  MoreVertical,
  Package,
  Plus,
  Search,
  ShieldCheck,
  UserRoundCog,
  Users,
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getVisiblePages } from "@/lib/catalog-utils";
import { staffMembers, staffRoleCounts, totalStaff, type StaffRole } from "@/data/staff";

const PAGE_SIZE = 10;
const TOTAL_RESULTS = staffMembers.length;
const TOTAL_PAGES = Math.max(1, Math.ceil(TOTAL_RESULTS / PAGE_SIZE));

const roleFilterOptions: (StaffRole | "All")[] = [
  "All",
  "Admin",
  "Sales Person",
  "Stock Manager",
  "Data Analyst",
];

const sortOptions = {
  asc: "Ascending A-Z",
  desc: "Descending Z-A",
} as const;

const kpis = [
  { label: "Total Staff", value: totalStaff.toLocaleString(), icon: Users },
  {
    label: "Administrators",
    value: staffRoleCounts.Admin,
    percent: ((staffRoleCounts.Admin / totalStaff) * 100).toFixed(2),
    icon: ShieldCheck,
  },
  {
    label: "Sales Team",
    value: staffRoleCounts["Sales Person"],
    percent: ((staffRoleCounts["Sales Person"] / totalStaff) * 100).toFixed(2),
    icon: Package,
  },
  {
    label: "Stock Managers",
    value: staffRoleCounts["Stock Manager"],
    percent: ((staffRoleCounts["Stock Manager"] / totalStaff) * 100).toFixed(2),
    icon: UserRoundCog,
  },
  {
    label: "Data Analysts",
    value: staffRoleCounts["Data Analyst"],
    percent: ((staffRoleCounts["Data Analyst"] / totalStaff) * 100).toFixed(2),
    icon: ChartPie,
  },
] as const;

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const KpiCards = () => (
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

const StaffManagementPage = () => {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof roleFilterOptions)[number]>("All");
  const [sortOrder, setSortOrder] = useState<keyof typeof sortOptions>("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = staffMembers.filter((staff) => {
      const matchesQuery =
        !normalizedQuery ||
        staff.name.toLowerCase().includes(normalizedQuery) ||
        staff.email.toLowerCase().includes(normalizedQuery) ||
        staff.role.toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "All" || staff.role === roleFilter;
      return matchesQuery && matchesRole;
    });

    const sorted = [...filtered].sort((a, b) =>
      sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    );

    return sorted;
  }, [query, roleFilter, sortOrder]);

  const isFiltered = query.trim().length > 0 || roleFilter !== "All";
  const totalPages = isFiltered ? Math.max(1, Math.ceil(results.length / PAGE_SIZE)) : TOTAL_PAGES;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const showingStart = results.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, results.length);
  const visiblePages = useMemo(() => getVisiblePages(safePage, totalPages), [safePage, totalPages]);
  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  const pageItems = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <AdminPageHeader
        title="Staff Management"
        subtitle="Manage system users, roles, and administrative access permissions."
      >
        <Button type="button" className="h-11 gap-2 px-5 text-sm font-bold">
          <Plus className="size-[18px]" /> Add New Staff
        </Button>
      </AdminPageHeader>

      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <KpiCards />

        <div className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-card p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, email or role..."
              className="h-11 rounded-lg pl-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0">
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as (typeof roleFilterOptions)[number]);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 w-full min-w-0 border-border sm:w-40">
                <SelectValue>{() => `Role (${roleFilter})`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roleFilterOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as keyof typeof sortOptions)}>
              <SelectTrigger className="h-11 w-full min-w-0 border-border sm:w-44">
                <SelectValue>{() => sortOptions[sortOrder]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortOptions).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" className="h-11 shrink-0 gap-2 border-border text-ink">
            <Filter className="size-4" /> Filters
          </Button>
        </div>

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
                {pageItems.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="min-w-56">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
                          {getInitials(staff.name)}
                        </span>
                        <span className="truncate text-sm font-semibold text-ink">{staff.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink">{staff.email}</TableCell>
                    <TableCell className="font-data whitespace-nowrap text-ink">{staff.phone}</TableCell>
                    <TableCell className="whitespace-nowrap text-ink">{staff.role}</TableCell>
                    <TableCell>
                      <Badge variant={staff.status === "Active" ? "primary" : "muted"}>
                        {staff.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button
                              type="button"
                              aria-label={`Actions for ${staff.name}`}
                              className="rounded-md p-1.5 text-ink hover:bg-secondary"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Edit Staff</DropdownMenuItem>
                          <DropdownMenuItem>
                            {staff.status === "Active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive">Remove Staff</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {results.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No staff members match your search.
            </p>
          )}

          <footer className="flex flex-col gap-4 border-t border-border p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {showingStart} to {showingEnd} of {results.length.toLocaleString()} results
            </p>
            <Pagination className="mx-0 w-auto justify-start py-0 sm:justify-end">
              <PaginationContent className="gap-1 sm:gap-2">
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    size="sm"
                    className="gap-1 text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                    aria-disabled={safePage === 1}
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
                    aria-disabled={safePage === 1}
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(safePage - 1);
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
                        isActive={safePage === page}
                        size="icon-sm"
                        className={
                          safePage === page
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
                    aria-disabled={safePage === totalPages}
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(safePage + 1);
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    size="sm"
                    className="gap-1 text-ink hover:text-amber aria-disabled:pointer-events-none aria-disabled:opacity-40"
                    aria-disabled={safePage === totalPages}
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
        </section>
      </div>
    </>
  );
};

export default StaffManagementPage;
