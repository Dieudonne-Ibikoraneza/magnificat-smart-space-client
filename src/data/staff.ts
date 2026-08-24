export type StaffRole = "Admin" | "Sales Person" | "Stock Manager" | "Data Analyst";
export type StaffStatus = "Active" | "Inactive";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
};

const firstNames = [
  "Sarah", "Eric", "Grace", "Patrick", "John", "Alice", "David", "Clarisse",
  "Emmanuel", "Jean", "Olivier", "Diane", "Fabrice", "Josiane", "Aline",
  "Vincent", "Chantal", "Robert", "Beatrice", "Samuel", "Immaculee", "Claude",
  "Solange", "Innocent", "Marie", "Theogene", "Yvonne", "Placide",
];

const lastNames = [
  "Uwimana", "Mukamana", "Nshuti", "Habimana", "Ingabire", "Bizimana",
  "Ndayisenga", "Umutoni", "Niyonzima", "Mutesi", "Nkurunziza", "Uwase",
  "Gasana", "Mukeshimana", "Rugamba", "Kayitesi", "Munyaneza", "Uwimbabazi",
];

const roleByCycle: StaffRole[] = [
  "Admin",
  "Sales Person", "Sales Person", "Sales Person", "Sales Person",
  "Stock Manager", "Stock Manager", "Stock Manager",
  "Data Analyst", "Data Analyst",
];

export const staffMembers: StaffMember[] = Array.from({ length: 842 }, (_, index) => {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const role = roleByCycle[index % roleByCycle.length];
  const suffix = Math.floor(index / (firstNames.length * lastNames.length));

  return {
    id: `STF-${1001 + index}`,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix > 0 ? suffix : ""}@magnificat.rw`,
    phone: `+250 780 ${String(100 + (index % 900)).padStart(3, "0")} ${String(index % 1000).padStart(3, "0")}`,
    role,
    status: index % 11 === 0 ? "Inactive" : "Active",
  };
});

export const staffRoleCounts = {
  Admin: 4,
  "Sales Person": 18,
  "Stock Manager": 12,
  "Data Analyst": 8,
} as const;

export const totalStaff = Object.values(staffRoleCounts).reduce((sum, count) => sum + count, 0);
