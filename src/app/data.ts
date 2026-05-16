export const modules = [
  "Receptionist",
  "Referral Officer",
  "HB Claims Team",
  "RMS Team",
  "Inspector",
  "Maintenance Team",
  "Tenants Management",
  "Support Officer",
  "Manager",
];

export const inspectorOptions = ["Leavers", "Transfers", "History"];

export const referralOfficers = ["Tuubee", "Amandeep", "Pal", "Shinu", "Louis"];

export const receptionistOptions = ["New Referral", "Follow ups", "History"];

export const referralOfficerOptions = [
  "Incoming from Reception",
  "Back filling",
  "History",
];

export const processingModules = [
  "HB Claims Team",
  "RMS Team",
  "Maintenance Team",
  "Tenants Management",
];

export const securedReferralModules = [
  "Referral Officer",
  "HB Claims Team",
  "RMS Team",
  "Tenants Management",
];

/** Parallel queues when Support Officer notifies a leaver. */
export const leaverNotifyModules = [
  "Tenants Management",
  "HB Claims Team",
] as const;

/** @deprecated Use leaverNotifyModules */
export const leaverInitialTeamModules = ["HB Claims Team"];

export const leaverTargetModules = [
  "HB Claims Team",
  "RMS Team",
  "Tenants Management",
];

/** Parallel queues when Support Officer notifies a transfer. */
export const transferNotifyModules = [
  "Tenants Management",
  "HB Claims Team",
] as const;

export const processingOptions = [
  "New Referral",
  "Leavers",
  "Transfers",
  "Pending Jobs",
  "History",
];

export const tenantsManagementExtraOption = "Cleaners";

export const processingHistoryOptions = ["Leavers", "Transfers", "New Referrals"];

export const supportOptions = ["Leaver", "Transfer", "History"];

export const supportHistoryOptions = ["Leavers", "Transfer"];

export const teamMembersByModule: Record<string, string[]> = {
  "Referral Officer": ["Tuubee", "Amandeep", "Pal", "Shinu", "Louis"],
  "HB Claims Team": ["HB Member 1", "HB Member 2", "HB Member 3"],
  "RMS Team": ["RMS Member 1", "RMS Member 2", "RMS Member 3"],
  "Tenants Management": ["TM Member 1", "TM Member 2", "TM Member 3"],
  "Maintenance Team": ["Maintenance Member 1", "Maintenance Member 2"],
};

export const supportWorkers = [
  "Support Worker 1",
  "Support Worker 2",
  "Support Worker 3",
];
