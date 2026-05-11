"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  inspectorOptions,
  leaverTargetModules,
  modules,
  processingHistoryOptions,
  processingModules,
  processingOptions,
  receptionistOptions,
  referralOfficerOptions,
  referralOfficers,
  securedReferralModules,
  supportWorkers,
  supportHistoryOptions,
  supportOptions,
  teamMembersByModule,
} from "./data";
import type {
  EligibilityResult,
  InspectionProblem,
  InspectionReport,
  LeaverRecord,
  ReferralRecord,
  TeamReferralRecord,
  TransferRecord,
} from "./types";
import {
  calculateAge,
  formatDisplayDate,
  getInitials,
  getReminderDates,
} from "./utils";
import { BackButton } from "./components/BackButton";
import { HistoryDetailPanel } from "./components/HistoryDetailPanel";
import { OptionCard } from "./components/OptionCard";
import { goBack, goForward } from "./transitions";
import { useCountUp } from "./useCountUp";
import { useNowTick } from "./useNowTick";
import { supabase } from "../lib/supabase";

type SupabaseReferralRow = {
  app_record_id: number;
  monday_item_id: string | null;
  full_name: string;
  phone_number: string | null;
  date_of_birth: string | null;
  age: number | null;
  ni_number: string | null;
  income_amount: number | null;
  family_members_below_10: number | null;
  referral_type: string | null;
  referral_officer: string | null;
  secured_property_address: string | null;
  secured_room_number: string | null;
  driver_status: ReferralRecord["status"] | null;
  referral_officer_status: string | null;
  support_worker: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  escalation_count: number | null;
  escalation_paused_at: string | null;
  hb_claims_status: string | null;
  rms_status: string | null;
  tenants_management_status: string | null;
  created_at: string;
};

type StoredInspectionProblem = {
  id: number;
  description: string;
  photoCount: number;
  videoCount: number;
};

type StoredInspectionReport = {
  problems: StoredInspectionProblem[];
  completedAt: string;
  inspectorName?: string;
};

type SupabaseLeaverRow = {
  app_record_id: number;
  monday_item_id: string | null;
  full_name: string;
  ni_number: string | null;
  property_address: string;
  room_number: string;
  leaving_date: string;
  maintenance_works_required: string | null;
  cleaning_type: "cleaning" | "maintenance" | null;
  has_maintenance_photos: boolean;
  has_maintenance_videos: boolean;
  tenants_management_status: string | null;
  hb_claims_status: string | null;
  rms_status: string | null;
  maintenance_status: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  escalation_count: number | null;
  assigned_job_date: string | null;
  cleaning_scheduled_date: string | null;
  maintenance_scheduled_date: string | null;
  inspection_report: StoredInspectionReport | null;
  created_at: string;
};

type SupabaseTransferRow = {
  app_record_id: number;
  monday_item_id: string | null;
  full_name: string;
  ni_number: string | null;
  current_property_address: string;
  current_room_number: string;
  transfer_date: string;
  new_property_address: string;
  new_room_number: string;
  old_room_maintenance_work: string | null;
  cleaning_type: "cleaning" | "maintenance" | null;
  has_maintenance_photos: boolean;
  has_maintenance_videos: boolean;
  tenants_management_status: string | null;
  hb_claims_status: string | null;
  rms_status: string | null;
  maintenance_status: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  escalation_count: number | null;
  assigned_job_date: string | null;
  cleaning_scheduled_date: string | null;
  maintenance_scheduled_date: string | null;
  inspection_report: StoredInspectionReport | null;
  created_at: string;
};

function KpiNumber({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{animated}</>;
}

export default function Home() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedReceptionAction, setSelectedReceptionAction] = useState<
    string | null
  >(null);
  const [selectedDriverAction, setSelectedDriverAction] = useState<
    string | null
  >(null);
  const [selectedProcessingAction, setSelectedProcessingAction] = useState<
    string | null
  >(null);
  const [selectedProcessingHistoryAction, setSelectedProcessingHistoryAction] =
    useState<string | null>(null);
  const [selectedSupportAction, setSelectedSupportAction] = useState<
    string | null
  >(null);
  const [selectedSupportHistoryAction, setSelectedSupportHistoryAction] =
    useState<string | null>(null);
  const [referralStep, setReferralStep] = useState(1);
  const [referralType, setReferralType] = useState("walk-in");
  const [referralOfficer, setReferralOfficer] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [tenantType, setTenantType] = useState("");
  const [familyMembersBelow10, setFamilyMembersBelow10] = useState("");
  const [proofMethod, setProofMethod] = useState("upload");
  const [niNumber, setNiNumber] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [leaverName, setLeaverName] = useState("");
  const [leaverNiNumber, setLeaverNiNumber] = useState("");
  const [leaverPropertyAddress, setLeaverPropertyAddress] = useState("");
  const [leaverRoomNumber, setLeaverRoomNumber] = useState("");
  const [leaverLeavingDate, setLeaverLeavingDate] = useState("");
  const [leaverCleaningType, setLeaverCleaningType] = useState<
    "cleaning" | "maintenance" | ""
  >("");
  const [maintenanceWorksRequired, setMaintenanceWorksRequired] = useState("");
  const [hasMaintenancePhotos, setHasMaintenancePhotos] = useState(false);
  const [hasMaintenanceVideos, setHasMaintenanceVideos] = useState(false);
  const [leaverSupportOfficerName, setLeaverSupportOfficerName] = useState("");
  const [transferName, setTransferName] = useState("");
  const [transferNiNumber, setTransferNiNumber] = useState("");
  const [transferCurrentProperty, setTransferCurrentProperty] = useState("");
  const [transferCurrentRoomNumber, setTransferCurrentRoomNumber] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [transferNewPropertyAddress, setTransferNewPropertyAddress] = useState("");
  const [transferNewRoomNumber, setTransferNewRoomNumber] = useState("");
  const [transferCleaningType, setTransferCleaningType] = useState<
    "cleaning" | "maintenance" | ""
  >("");
  const [transferMaintenanceWork, setTransferMaintenanceWork] = useState("");
  const [transferHasMaintenancePhotos, setTransferHasMaintenancePhotos] =
    useState(false);
  const [transferHasMaintenanceVideos, setTransferHasMaintenanceVideos] =
    useState(false);
  const [transferSupportOfficerName, setTransferSupportOfficerName] =
    useState("");
  const [editingFollowUpId, setEditingFollowUpId] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<ReferralRecord[]>([]);
  const [driverQueue, setDriverQueue] = useState<ReferralRecord[]>([]);
  const [history, setHistory] = useState<ReferralRecord[]>([]);
  const [teamNewReferrals, setTeamNewReferrals] = useState<
    Record<string, TeamReferralRecord[]>
  >({});
  const [teamHistory, setTeamHistory] = useState<
    Record<string, TeamReferralRecord[]>
  >({});
  const [teamLeavers, setTeamLeavers] = useState<Record<string, LeaverRecord[]>>(
    {},
  );
  const [teamLeaverHistory, setTeamLeaverHistory] = useState<
    Record<string, LeaverRecord[]>
  >({});
  const [supportLeaverHistory, setSupportLeaverHistory] = useState<
    LeaverRecord[]
  >([]);
  const [teamTransfers, setTeamTransfers] = useState<
    Record<string, TransferRecord[]>
  >({});
  const [teamTransferHistory, setTeamTransferHistory] = useState<
    Record<string, TransferRecord[]>
  >({});
  const [maintenancePendingLeavers, setMaintenancePendingLeavers] = useState<
    LeaverRecord[]
  >([]);
  const [maintenancePendingTransfers, setMaintenancePendingTransfers] = useState<
    TransferRecord[]
  >([]);
  const [maintenanceCompletionEvidence, setMaintenanceCompletionEvidence] =
    useState<Record<string, { hasPhotos: boolean; hasVideos: boolean }>>({});
  const [supportTransferHistory, setSupportTransferHistory] = useState<
    TransferRecord[]
  >([]);
  const [teamRejectionReasons, setTeamRejectionReasons] = useState<
    Record<string, string>
  >({});
  const [leaverScheduleDates, setLeaverScheduleDates] = useState<
    Record<
      string,
      { assignedDate?: string; cleaningDate?: string; maintenanceDate?: string }
    >
  >({});
  const [inspectorLeavers, setInspectorLeavers] = useState<LeaverRecord[]>([]);
  const [inspectorTransfers, setInspectorTransfers] = useState<TransferRecord[]>(
    [],
  );
  const [inspectorHistory, setInspectorHistory] = useState<
    (LeaverRecord | TransferRecord)[]
  >([]);
  const [selectedInspectorAction, setSelectedInspectorAction] = useState<
    string | null
  >(null);
  const [selectedInspectionTarget, setSelectedInspectionTarget] = useState<
    LeaverRecord | TransferRecord | null
  >(null);
  const [inspectionDraft, setInspectionDraft] = useState<InspectionProblem[]>(
    [],
  );
  const [selectedInspectorHistoryRecord, setSelectedInspectorHistoryRecord] =
    useState<LeaverRecord | TransferRecord | null>(null);
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<
    ReferralRecord | TeamReferralRecord | LeaverRecord | TransferRecord | null
  >(null);
  const [selectedManagerReferralId, setSelectedManagerReferralId] = useState<
    number | null
  >(null);
  const [boardSearch, setBoardSearch] = useState<Record<string, string>>({});
  const [eligibilityResult, setEligibilityResult] =
    useState<EligibilityResult | null>(null);

  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);
  const isReceptionist = selectedModule === "Receptionist";
  const isReferralOfficer = selectedModule === "Referral Officer";
  const isSupportOfficer = selectedModule === "Support Officer";
  const isManager = selectedModule === "Manager";
  const isInspector = selectedModule === "Inspector";
  const inspectorName = "Inspector";
  const nowMs = useNowTick(60_000);
  const isProcessingModule = selectedModule
    ? processingModules.includes(selectedModule)
    : false;
  const isNewReferral = selectedReceptionAction === "New Referral";
  const showOptionsBanner =
    !selectedModule ||
    (isReceptionist && !selectedReceptionAction) ||
    (isReferralOfficer && !selectedDriverAction) ||
    (isProcessingModule && !selectedProcessingAction) ||
    (isSupportOfficer && !selectedSupportAction) ||
    (isInspector && !selectedInspectorAction);
  const totalReferralSteps = 3;
  const assignedModules = modules;
  const maintenancePendingCount =
    maintenancePendingLeavers.length + maintenancePendingTransfers.length;
  const maintenanceOverdueCount = [
    ...maintenancePendingLeavers,
    ...maintenancePendingTransfers,
  ].filter((record) => isTodayOrOverdue(record.assignedJobDate)).length;
  const managerName = "Manager";
  const managerDepartments = [
    "Referral Officer",
    "RMS Team",
    "Tenants Management",
    "HB Claims Team",
  ] as const;

  const managerReferralRows = useMemo(() => {
    const rows = new Map<
      number,
      {
        record: ReferralRecord;
        statusByDepartment: Record<string, string>;
        reasonByDepartment: Record<string, string>;
      }
    >();

    const ensureRow = (record: ReferralRecord) => {
      const existing = rows.get(record.id);
      if (existing) {
        return existing;
      }
      const next = {
        record,
        statusByDepartment: {} as Record<string, string>,
        reasonByDepartment: {} as Record<string, string>,
      };
      rows.set(record.id, next);
      return next;
    };

    [...driverQueue, ...history.filter((record) => record.status === "secured")].forEach(
      (record) => {
        ensureRow(record);
      },
    );

    managerDepartments.forEach((department) => {
      (teamNewReferrals[department] ?? []).forEach((teamRecord) => {
        const row = ensureRow(teamRecord);
        row.record = { ...row.record, ...teamRecord };
        row.statusByDepartment[department] =
          teamRecord.teamOutcome === "awaiting-information"
            ? "Awaiting info"
            : "Pending";
        if (teamRecord.teamRejectionReason) {
          row.reasonByDepartment[department] = teamRecord.teamRejectionReason;
        }
      });

      (teamHistory[department] ?? []).forEach((teamRecord) => {
        const row = ensureRow(teamRecord);
        row.record = { ...row.record, ...teamRecord };
        row.statusByDepartment[department] =
          teamRecord.teamOutcome === "uploaded"
            ? "Done"
            : teamRecord.teamOutcome === "rejected"
              ? "Rejected"
              : "Awaiting info";
        if (teamRecord.teamRejectionReason) {
          row.reasonByDepartment[department] = teamRecord.teamRejectionReason;
        }
      });
    });

    return Array.from(rows.values()).sort(
      (a, b) => b.record.createdAt.getTime() - a.record.createdAt.getTime(),
    );
  }, [driverQueue, history, managerDepartments, teamHistory, teamNewReferrals]);

  const selectedManagerReferral = managerReferralRows.find(
    (row) => row.record.id === selectedManagerReferralId,
  );

  const managerOverdueCount = managerDepartments.reduce((total, dept) => {
    const referralOverdue = (teamNewReferrals[dept] ?? []).filter(
      (record) => getEscalationStatus(dept, record).level === "overdue",
    ).length;
    const leaverOverdue = (teamLeavers[dept] ?? []).filter(
      (record) => getEscalationStatus(dept, record).level === "overdue",
    ).length;
    const transferOverdue = (teamTransfers[dept] ?? []).filter(
      (record) => getEscalationStatus(dept, record).level === "overdue",
    ).length;
    return total + referralOverdue + leaverOverdue + transferOverdue;
  }, 0);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedRecords() {
      const [referralsResult, leaversResult, transfersResult] =
        await Promise.all([
          supabase.from("referrals").select("*").order("created_at", {
            ascending: false,
          }),
          supabase.from("leavers").select("*").order("created_at", {
            ascending: false,
          }),
          supabase.from("transfers").select("*").order("created_at", {
            ascending: false,
          }),
        ]);

      if (referralsResult.error) {
        console.error("Could not load referrals", referralsResult.error);
        toast.error("Could not load referrals", {
          description: referralsResult.error.message,
        });
      }

      if (leaversResult.error) {
        console.error("Could not load leavers", leaversResult.error);
        toast.error("Could not load leavers", {
          description: leaversResult.error.message,
        });
      }

      if (transfersResult.error) {
        console.error("Could not load transfers", transfersResult.error);
        toast.error("Could not load transfers", {
          description: transfersResult.error.message,
        });
      }

      if (!isMounted) {
        return;
      }

      hydrateReferralRecords(
        (referralsResult.data ?? []) as SupabaseReferralRow[],
      );
      hydrateLeaverRecords((leaversResult.data ?? []) as SupabaseLeaverRow[]);
      hydrateTransferRecords(
        (transfersResult.data ?? []) as SupabaseTransferRow[],
      );
    }

    void loadSavedRecords();

    return () => {
      isMounted = false;
    };
  }, []);

  function resetReferralForm() {
    setReferralStep(1);
    setReferralType("walk-in");
    setReferralOfficer("");
    setFullName("");
    setPhoneNumber("");
    setDateOfBirth("");
    setTenantType("");
    setFamilyMembersBelow10("");
    setProofMethod("upload");
    setNiNumber("");
    setIncomeAmount("");
    setEditingFollowUpId(null);
    setEligibilityResult(null);
  }

  function resetLeaverForm() {
    setLeaverName("");
    setLeaverNiNumber("");
    setLeaverSupportOfficerName("");
    setLeaverPropertyAddress("");
    setLeaverRoomNumber("");
    setLeaverLeavingDate("");
    setLeaverCleaningType("");
    setMaintenanceWorksRequired("");
    setHasMaintenancePhotos(false);
    setHasMaintenanceVideos(false);
  }

  function resetTransferForm() {
    setTransferName("");
    setTransferNiNumber("");
    setTransferSupportOfficerName("");
    setTransferCurrentProperty("");
    setTransferCurrentRoomNumber("");
    setTransferDate("");
    setTransferNewPropertyAddress("");
    setTransferNewRoomNumber("");
    setTransferCleaningType("");
    setTransferMaintenanceWork("");
    setTransferHasMaintenancePhotos(false);
    setTransferHasMaintenanceVideos(false);
  }

  function addRecordToMap<T>(map: Record<string, T[]>, key: string, record: T) {
    map[key] = [record, ...(map[key] ?? [])];
  }

  function isTodayOrOverdue(date?: string) {
    if (!date) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return targetDate <= today;
  }

  function getEscalationRule(department: string) {
    if (department === "Referral Officer") {
      return { slaHours: 2 };
    }

    if (
      department === "RMS Team" ||
      department === "HB Claims Team" ||
      department === "Tenants Management"
    ) {
      return { slaHours: 24 };
    }

    return null;
  }

  function formatRemaining(ms: number) {
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) {
      return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours === 0
      ? `${days}d`
      : `${days}d ${remainingHours}h`;
  }

  type EscalationLevel =
    | "unassigned"
    | "on-time"
    | "overdue"
    | "awaiting"
    | "done";

  function getEscalationStatus(
    department: string,
    record: {
      assignedAt?: Date;
      escalationPausedAt?: Date;
      teamOutcome?: TeamReferralRecord["teamOutcome"];
    },
  ): { label: string; level: EscalationLevel } {
    if (record.teamOutcome === "uploaded" || record.teamOutcome === "rejected") {
      return { label: "Closed", level: "done" };
    }

    if (
      record.teamOutcome === "awaiting-information" ||
      record.escalationPausedAt
    ) {
      return { label: "Awaiting information", level: "awaiting" };
    }

    if (!record.assignedAt) {
      return { label: "Unassigned", level: "unassigned" };
    }

    const rule = getEscalationRule(department);
    if (!rule) {
      return { label: "Assigned", level: "on-time" };
    }

    const slaMs = rule.slaHours * 60 * 60 * 1000;
    const elapsedMs = nowMs - record.assignedAt.getTime();

    if (elapsedMs < slaMs) {
      return {
        label: `Due in ${formatRemaining(slaMs - elapsedMs)}`,
        level: "on-time",
      };
    }

    return {
      label: `Overdue by ${formatRemaining(elapsedMs - slaMs)}`,
      level: "overdue",
    };
  }

  function getProcessingOptionBadge(option: string) {
    if (!selectedModule) {
      return { alert: false, count: 0 };
    }

    if (option === "New Referral") {
      return { alert: false, count: teamNewReferrals[selectedModule]?.length ?? 0 };
    }

    if (option === "Leavers") {
      return { alert: false, count: teamLeavers[selectedModule]?.length ?? 0 };
    }

    if (option === "Transfers") {
      return { alert: false, count: teamTransfers[selectedModule]?.length ?? 0 };
    }

    if (option === "Pending Jobs" && selectedModule === "Maintenance Team") {
      return {
        alert: maintenanceOverdueCount > 0,
        count: maintenanceOverdueCount || maintenancePendingCount,
      };
    }

    return { alert: false, count: 0 };
  }

  function getSavedDepartmentStatus(
    record:
      | SupabaseReferralRow
      | SupabaseLeaverRow
      | SupabaseTransferRow,
    department: string,
  ) {
    if (department === "Referral Officer" && "referral_officer_status" in record) {
      return record.referral_officer_status;
    }

    if (department === "HB Claims Team") {
      return record.hb_claims_status;
    }

    if (department === "RMS Team") {
      return record.rms_status;
    }

    if (department === "Tenants Management") {
      return record.tenants_management_status;
    }

    if (department === "Maintenance Team" && "maintenance_status" in record) {
      return record.maintenance_status;
    }

    return null;
  }

  function getTeamOutcomeFromSavedStatus(
    status: string | null,
  ): TeamReferralRecord["teamOutcome"] {
    return status === "done" || status === "assigned"
      ? "uploaded"
      : "awaiting-information";
  }

  function mapReferralRow(record: SupabaseReferralRow): ReferralRecord {
    return {
      id: record.app_record_id,
      mondayItemId: record.monday_item_id ?? undefined,
      fullName: record.full_name,
      age: record.age?.toString() ?? "",
      dateOfBirth: record.date_of_birth ?? "",
      niNumber: record.ni_number ?? "",
      incomeAmount: record.income_amount?.toString() ?? "",
      phoneNumber: record.phone_number ?? "",
      familyMembersBelow10: record.family_members_below_10?.toString() ?? "",
      referralType: record.referral_type ?? "walk-in",
      referralOfficer: record.referral_officer ?? "",
      supportWorker: record.support_worker ?? undefined,
      driverAccepted: record.driver_status !== "driver",
      currentProperty: record.secured_property_address ?? "",
      currentRoomNumber: record.secured_room_number ?? "",
      propertyAccepted: record.driver_status === "secured",
      rejectedPropertyCount: 0,
      rejectionReason: "",
      status: record.driver_status ?? "driver",
      reasons: [],
      assignedTo: record.assigned_to ?? undefined,
      assignedBy: record.assigned_by ?? undefined,
      assignedAt: record.assigned_at ? new Date(record.assigned_at) : undefined,
      escalationCount: record.escalation_count ?? 0,
      escalationPausedAt: record.escalation_paused_at
        ? new Date(record.escalation_paused_at)
        : undefined,
      createdAt: new Date(record.created_at),
    };
  }

  function mapInspectionReport(
    stored: StoredInspectionReport | null,
  ): InspectionReport | undefined {
    if (!stored) {
      return undefined;
    }
    return {
      problems: stored.problems ?? [],
      completedAt: new Date(stored.completedAt),
      inspectorName: stored.inspectorName,
    };
  }

  function describeSupabaseError(error: unknown) {
    if (!error || typeof error !== "object") {
      return { summary: String(error), detail: "" };
    }
    const e = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const summary = e.message || e.details || e.code || "Unknown error";
    const detail = [
      e.code ? `code: ${e.code}` : "",
      e.details ? `details: ${e.details}` : "",
      e.hint ? `hint: ${e.hint}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    return { summary, detail };
  }

  function serialiseInspectionReport(
    report: InspectionReport | undefined,
  ): StoredInspectionReport | null {
    if (!report) {
      return null;
    }
    return {
      problems: report.problems,
      completedAt: report.completedAt.toISOString(),
      inspectorName: report.inspectorName,
    };
  }

  function mapLeaverRow(record: SupabaseLeaverRow): LeaverRecord {
    return {
      id: record.app_record_id,
      mondayItemId: record.monday_item_id ?? undefined,
      name: record.full_name,
      niNumber: record.ni_number ?? "",
      propertyAddress: record.property_address,
      roomNumber: record.room_number,
      leavingDate: record.leaving_date,
      cleaningType: record.cleaning_type ?? "",
      maintenanceWorksRequired: record.maintenance_works_required ?? "",
      hasMaintenancePhotos: record.has_maintenance_photos,
      hasMaintenanceVideos: record.has_maintenance_videos,
      assignedJobDate: record.assigned_job_date ?? undefined,
      cleaningScheduledDate: record.cleaning_scheduled_date ?? undefined,
      maintenanceScheduledDate: record.maintenance_scheduled_date ?? undefined,
      assignedTo: record.assigned_to ?? undefined,
      assignedBy: record.assigned_by ?? undefined,
      assignedAt: record.assigned_at ? new Date(record.assigned_at) : undefined,
      escalationCount: record.escalation_count ?? 0,
      inspectionReport: mapInspectionReport(record.inspection_report ?? null),
      createdAt: new Date(record.created_at),
    };
  }

  function mapTransferRow(record: SupabaseTransferRow): TransferRecord {
    return {
      id: record.app_record_id,
      mondayItemId: record.monday_item_id ?? undefined,
      name: record.full_name,
      niNumber: record.ni_number ?? "",
      currentProperty: record.current_property_address,
      currentRoomNumber: record.current_room_number,
      transferDate: record.transfer_date,
      newPropertyAddress: record.new_property_address,
      newRoomNumber: record.new_room_number,
      cleaningType: record.cleaning_type ?? "",
      oldRoomMaintenanceWork: record.old_room_maintenance_work ?? "",
      hasMaintenancePhotos: record.has_maintenance_photos,
      hasMaintenanceVideos: record.has_maintenance_videos,
      assignedJobDate: record.assigned_job_date ?? undefined,
      assignedTo: record.assigned_to ?? undefined,
      assignedBy: record.assigned_by ?? undefined,
      assignedAt: record.assigned_at ? new Date(record.assigned_at) : undefined,
      escalationCount: record.escalation_count ?? 0,
      inspectionReport: mapInspectionReport(record.inspection_report ?? null),
      createdAt: new Date(record.created_at),
    };
  }

  function hydrateReferralRecords(records: SupabaseReferralRow[]) {
    const loadedFollowUps: ReferralRecord[] = [];
    const loadedDriverQueue: ReferralRecord[] = [];
    const loadedHistory: ReferralRecord[] = [];
    const loadedTeamQueues: Record<string, TeamReferralRecord[]> = {};
    const loadedTeamHistory: Record<string, TeamReferralRecord[]> = {};

    records.forEach((row) => {
      const record = mapReferralRow(row);

      if (record.status === "follow-up") {
        loadedFollowUps.push(record);
      } else if (record.status === "driver") {
        loadedDriverQueue.push(record);
      } else if (
        record.status === "failed" ||
        record.status === "secured" ||
        record.status === "viewing-ended"
      ) {
        loadedHistory.push(record);
      }

      if (record.status === "secured") {
        securedReferralModules.forEach((department) => {
          const teamRecord = { ...record, department };
          const savedStatus = getSavedDepartmentStatus(row, department);

          if (savedStatus) {
            addRecordToMap(loadedTeamHistory, department, {
              ...teamRecord,
              teamOutcome: getTeamOutcomeFromSavedStatus(savedStatus),
            });
          } else {
            addRecordToMap(loadedTeamQueues, department, teamRecord);
          }
        });
      }
    });

    setFollowUps(loadedFollowUps);
    setDriverQueue(loadedDriverQueue);
    setHistory(loadedHistory);
    setTeamNewReferrals(loadedTeamQueues);
    setTeamHistory(loadedTeamHistory);
  }

  function hydrateLeaverRecords(records: SupabaseLeaverRow[]) {
    const loadedSupportHistory = records.map(mapLeaverRow);
    const loadedTeamQueues: Record<string, LeaverRecord[]> = {};
    const loadedTeamHistory: Record<string, LeaverRecord[]> = {};
    const loadedMaintenancePending: LeaverRecord[] = [];
    const loadedInspectorQueue: LeaverRecord[] = [];
    const loadedInspectorHistory: LeaverRecord[] = [];

    records.forEach((row) => {
      const record = mapLeaverRow(row);
      const maintenanceStatus = row.maintenance_status;
      const maintenanceQueue: LeaverRecord = {
        ...record,
        department: "Maintenance Team",
      };

      if (record.inspectionReport) {
        loadedInspectorHistory.push(record);

        if (maintenanceStatus === "assigned") {
          loadedMaintenancePending.push(maintenanceQueue);
        } else if (maintenanceStatus === "done") {
          addRecordToMap(loadedTeamHistory, "Maintenance Team", maintenanceQueue);
        } else {
          addRecordToMap(loadedTeamQueues, "Maintenance Team", maintenanceQueue);
        }
      } else {
        loadedInspectorQueue.push(record);
      }

      leaverTargetModules.forEach((department) => {
        const teamRecord = { ...record, department };
        const savedStatus = getSavedDepartmentStatus(row, department);

        if (savedStatus) {
          addRecordToMap(loadedTeamHistory, department, teamRecord);
        } else {
          addRecordToMap(loadedTeamQueues, department, teamRecord);
        }
      });
    });

    setSupportLeaverHistory(loadedSupportHistory);
    setTeamLeavers(loadedTeamQueues);
    setTeamLeaverHistory(loadedTeamHistory);
    setMaintenancePendingLeavers(loadedMaintenancePending);
    setInspectorLeavers(loadedInspectorQueue);
    setInspectorHistory((current) => [...loadedInspectorHistory, ...current]);
  }

  function hydrateTransferRecords(records: SupabaseTransferRow[]) {
    const loadedSupportHistory = records.map(mapTransferRow);
    const loadedTeamQueues: Record<string, TransferRecord[]> = {};
    const loadedTeamHistory: Record<string, TransferRecord[]> = {};
    const loadedMaintenancePending: TransferRecord[] = [];
    const loadedInspectorQueue: TransferRecord[] = [];
    const loadedInspectorHistory: TransferRecord[] = [];

    records.forEach((row) => {
      const record = mapTransferRow(row);
      const maintenanceStatus = row.maintenance_status;
      const maintenanceQueue: TransferRecord = {
        ...record,
        department: "Maintenance Team",
      };

      if (record.inspectionReport) {
        loadedInspectorHistory.push(record);

        if (maintenanceStatus === "assigned") {
          loadedMaintenancePending.push(maintenanceQueue);
        } else if (maintenanceStatus === "done") {
          addRecordToMap(loadedTeamHistory, "Maintenance Team", maintenanceQueue);
        } else {
          addRecordToMap(loadedTeamQueues, "Maintenance Team", maintenanceQueue);
        }
      } else {
        loadedInspectorQueue.push(record);
      }

      leaverTargetModules.forEach((department) => {
        const teamRecord = { ...record, department };
        const savedStatus = getSavedDepartmentStatus(row, department);

        if (savedStatus) {
          addRecordToMap(loadedTeamHistory, department, teamRecord);
        } else {
          addRecordToMap(loadedTeamQueues, department, teamRecord);
        }
      });
    });

    setSupportTransferHistory(loadedSupportHistory);
    setTeamTransfers(loadedTeamQueues);
    setTeamTransferHistory(loadedTeamHistory);
    setMaintenancePendingTransfers(loadedMaintenancePending);
    setInspectorTransfers(loadedInspectorQueue);
    setInspectorHistory((current) => [...loadedInspectorHistory, ...current]);
  }

  function createReferralRecord(
    status: ReferralRecord["status"],
    reasons: string[],
  ): ReferralRecord {
    return {
      id: editingFollowUpId ?? Date.now(),
      fullName: fullName.trim() || "Unnamed referral",
      age,
      dateOfBirth,
      niNumber,
      incomeAmount,
      phoneNumber,
      familyMembersBelow10,
      referralType,
      referralOfficer: referralType === "sourced" ? referralOfficer : "",
      driverAccepted: false,
      currentProperty: "",
      currentRoomNumber: "",
      propertyAccepted: false,
      rejectedPropertyCount: 0,
      rejectionReason: "",
      status,
      reasons,
      createdAt: new Date(),
    };
  }

  function openFollowUpForEdit(record: ReferralRecord) {
    setEditingFollowUpId(record.id);
    setFullName(record.fullName === "Unnamed referral" ? "" : record.fullName);
    setPhoneNumber(record.phoneNumber);
    setReferralType(record.referralType);
    setReferralOfficer(record.referralOfficer);
    setNiNumber(record.niNumber);
    setIncomeAmount(record.incomeAmount);
    setDateOfBirth(record.dateOfBirth);
    setFamilyMembersBelow10(record.familyMembersBelow10);
    setReferralStep(3);
    setSelectedReceptionAction("New Referral");
    setEligibilityResult(null);
  }

  function parseOptionalInteger(value: string) {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  function parseOptionalMoney(value: string) {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  async function saveReferralRecord(record: ReferralRecord) {
    const { error } = await supabase.from("referrals").upsert(
      {
        app_record_id: record.id,
        full_name: record.fullName,
        phone_number: record.phoneNumber || null,
        date_of_birth: record.dateOfBirth || null,
        age: parseOptionalInteger(record.age),
        ni_number: record.niNumber || null,
        income_amount: parseOptionalMoney(record.incomeAmount),
        family_members_below_10: parseOptionalInteger(
          record.familyMembersBelow10,
        ),
        referral_type: record.referralType,
        referral_officer: record.referralOfficer || null,
        support_worker: record.supportWorker || null,
        secured_property_address: record.currentProperty || null,
        secured_room_number: record.currentRoomNumber || null,
        driver_status: record.status,
        assigned_to: record.assignedTo || null,
        assigned_by: record.assignedBy || null,
        assigned_at: record.assignedAt?.toISOString() ?? null,
        escalation_count: record.escalationCount ?? 0,
        escalation_paused_at: record.escalationPausedAt?.toISOString() ?? null,
        monday_item_id: record.mondayItemId || null,
      },
      { onConflict: "app_record_id" },
    );

    if (error) {
      const info = describeSupabaseError(error);
      console.error(
        "Could not save referral to Supabase",
        info.summary,
        info.detail,
        error,
      );
      toast.error("Could not save referral", { description: info.summary });
    }
  }

  async function saveLeaverRecord(record: LeaverRecord) {
    const { error } = await supabase.from("leavers").upsert(
      {
        app_record_id: record.id,
        full_name: record.name,
        ni_number: record.niNumber || null,
        property_address: record.propertyAddress,
        room_number: record.roomNumber,
        leaving_date: record.leavingDate,
        maintenance_works_required: record.maintenanceWorksRequired || null,
        cleaning_type: record.cleaningType || null,
        has_maintenance_photos: record.hasMaintenancePhotos,
        has_maintenance_videos: record.hasMaintenanceVideos,
        assigned_job_date: record.assignedJobDate || null,
        assigned_to: record.assignedTo || null,
        assigned_by: record.assignedBy || null,
        assigned_at: record.assignedAt?.toISOString() ?? null,
        escalation_count: record.escalationCount ?? 0,
        inspection_report: serialiseInspectionReport(record.inspectionReport),
        monday_item_id: record.mondayItemId || null,
      },
      { onConflict: "app_record_id" },
    );

    if (error) {
      const info = describeSupabaseError(error);
      console.error(
        "Could not save leaver to Supabase",
        info.summary,
        info.detail,
        error,
      );
      toast.error("Could not save leaver", { description: info.summary });
    }
  }

  async function saveTransferRecord(record: TransferRecord) {
    const { error } = await supabase.from("transfers").upsert(
      {
        app_record_id: record.id,
        full_name: record.name,
        ni_number: record.niNumber || null,
        current_property_address: record.currentProperty,
        current_room_number: record.currentRoomNumber,
        transfer_date: record.transferDate,
        new_property_address: record.newPropertyAddress,
        new_room_number: record.newRoomNumber,
        old_room_maintenance_work: record.oldRoomMaintenanceWork || null,
        cleaning_type: record.cleaningType || null,
        has_maintenance_photos: record.hasMaintenancePhotos,
        has_maintenance_videos: record.hasMaintenanceVideos,
        assigned_job_date: record.assignedJobDate || null,
        assigned_to: record.assignedTo || null,
        assigned_by: record.assignedBy || null,
        assigned_at: record.assignedAt?.toISOString() ?? null,
        escalation_count: record.escalationCount ?? 0,
        inspection_report: serialiseInspectionReport(record.inspectionReport),
        monday_item_id: record.mondayItemId || null,
      },
      { onConflict: "app_record_id" },
    );

    if (error) {
      const info = describeSupabaseError(error);
      console.error(
        "Could not save transfer to Supabase",
        info.summary,
        info.detail,
        error,
      );
      toast.error("Could not save transfer", { description: info.summary });
    }
  }

  function getTeamStatusColumn(department: string) {
    if (department === "Referral Officer") {
      return "referral_officer_status";
    }

    if (department === "HB Claims Team") {
      return "hb_claims_status";
    }

    if (department === "RMS Team") {
      return "rms_status";
    }

    if (department === "Tenants Management") {
      return "tenants_management_status";
    }

    if (department === "Maintenance Team") {
      return "maintenance_status";
    }

    return null;
  }

  function getStoredOutcome(
    outcome:
      | TeamReferralRecord["teamOutcome"]
      | "updated"
      | "assigned"
      | "completed",
  ) {
    if (outcome === "uploaded" || outcome === "updated") {
      return "done";
    }

    if (outcome === "assigned") {
      return "assigned";
    }

    if (outcome === "completed") {
      return "done";
    }

    return "stuck";
  }

  async function updateSupabaseTeamStatus(
    table: "referrals" | "leavers" | "transfers",
    appRecordId: number,
    department: string,
    outcome:
      | TeamReferralRecord["teamOutcome"]
      | "updated"
      | "assigned"
      | "completed",
    dates?: {
      assignedDate?: string;
      cleaningDate?: string;
      maintenanceDate?: string;
    },
  ) {
    const column = getTeamStatusColumn(department);

    if (!column) {
      return;
    }

    const updates: Record<string, string | null> = {
      [column]: getStoredOutcome(outcome),
    };

    if (dates?.cleaningDate) {
      updates.cleaning_scheduled_date = dates.cleaningDate;
    }

    if (dates?.assignedDate) {
      updates.assigned_job_date = dates.assignedDate;
    }

    if (dates?.maintenanceDate) {
      updates.maintenance_scheduled_date = dates.maintenanceDate;
    }

    const { error } = await supabase
      .from(table)
      .update(updates)
      .eq("app_record_id", appRecordId);

    if (error) {
      console.error(`Could not update ${table} team status in Supabase`, error);
      toast.error("Could not update team status", {
        description: error.message,
      });
    }
  }

  async function createMondayItem(
    action: "create-referral" | "create-leaver" | "create-transfer",
    record: ReferralRecord | LeaverRecord | TransferRecord,
  ) {
    try {
      const response = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, record }),
      });

      const result = (await response.json()) as {
        itemId?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Could not create Monday item.");
      }

      return result.itemId;
    } catch (error) {
      console.error("Could not create Monday item", error);
      toast.error("Could not sync with Monday", {
        description: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  async function updateMondayTeamStatus(
    board: "referrals" | "leavers" | "transfers",
    record: ReferralRecord | LeaverRecord | TransferRecord,
    department: string,
    outcome:
      | TeamReferralRecord["teamOutcome"]
      | "updated"
      | "assigned"
      | "completed",
    dates?: { noticeDate?: string; assignedDate?: string },
  ) {
    if (!record.mondayItemId) {
      return;
    }

    try {
      const response = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-team-status",
          board,
          itemId: record.mondayItemId,
          department,
          outcome,
          dates,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "Could not update Monday item.");
      }
    } catch (error) {
      console.error("Could not update Monday item", error);
      toast.error("Could not sync update with Monday", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function moveDriverReferralToHistory(
    record: ReferralRecord,
    status: "secured" | "viewing-ended",
  ) {
    setDriverQueue((records) =>
      records.filter((driverRecord) => driverRecord.id !== record.id),
    );
    let completedRecord: ReferralRecord = {
      ...record,
      status,
      reasons:
        status === "secured"
          ? ["Property secured by driver."]
          : ["Viewing ended or tenant refused remaining properties."],
    };

    if (status === "secured") {
      const mondayItemId = await createMondayItem(
        "create-referral",
        completedRecord,
      );

      completedRecord = {
        ...completedRecord,
        mondayItemId,
      };
    }

    setHistory((records) => [completedRecord, ...records]);
    void saveReferralRecord(completedRecord);

    if (status === "secured") {
      setTeamNewReferrals((queues) => {
        const nextQueues = { ...queues };

        securedReferralModules.forEach((module) => {
          nextQueues[module] = [
            {
              ...completedRecord,
              department: module,
            },
            ...(nextQueues[module] ?? []),
          ];
        });

        return nextQueues;
      });
    }
  }

  function updateDriverRecord(
    id: number,
    updates: Partial<ReferralRecord>,
  ) {
    setDriverQueue((records) =>
      records.map((driverRecord) =>
        driverRecord.id === id
          ? { ...driverRecord, ...updates }
          : driverRecord,
      ),
    );
  }

  function rejectDriverProperty(record: ReferralRecord) {
    if (record.rejectedPropertyCount >= 1) {
      void moveDriverReferralToHistory(record, "viewing-ended");
      return;
    }

    updateDriverRecord(record.id, {
      currentProperty: "",
      currentRoomNumber: "",
      rejectedPropertyCount: record.rejectedPropertyCount + 1,
    });
  }

  function assignIncomingReferral(id: number, assignee: string) {
    const assignedAt = new Date();
    let updatedRecord: ReferralRecord | null = null;
    setDriverQueue((records) =>
      records.map((record) => {
        if (record.id !== id) {
          return record;
        }

        const nextRecord: ReferralRecord = {
          ...record,
          assignedTo: assignee || undefined,
          assignedBy: assignee ? managerName : undefined,
          assignedAt: assignee ? assignedAt : undefined,
          escalationCount: 0,
        };
        updatedRecord = nextRecord;
        return nextRecord;
      }),
    );
    if (updatedRecord) {
      void saveReferralRecord(updatedRecord);
      toast.success(
        assignee ? `Assigned to ${assignee}` : "Assignment cleared",
      );
    }
  }

  function assignTeamReferral(
    department: string,
    id: number,
    assignee: string,
  ) {
    const assignedAt = new Date();
    let updatedRecord: TeamReferralRecord | null = null;
    setTeamNewReferrals((queues) => ({
      ...queues,
      [department]: (queues[department] ?? []).map((record) => {
        if (record.id !== id) {
          return record;
        }
        updatedRecord = {
          ...record,
          assignedTo: assignee || undefined,
          assignedBy: assignee ? managerName : undefined,
          assignedAt: assignee ? assignedAt : undefined,
          escalationCount: 0,
        };
        return updatedRecord;
      }),
    }));
    if (updatedRecord) {
      void saveReferralRecord(updatedRecord);
      toast.success(
        assignee
          ? `Assigned to ${assignee} in ${department}`
          : "Assignment cleared",
      );
    }
  }

  function assignLeaverRecord(department: string, id: number, assignee: string) {
    const assignedAt = new Date();
    let updatedRecord: LeaverRecord | null = null;
    setTeamLeavers((queues) => ({
      ...queues,
      [department]: (queues[department] ?? []).map((record) => {
        if (record.id !== id) {
          return record;
        }
        updatedRecord = {
          ...record,
          assignedTo: assignee || undefined,
          assignedBy: assignee ? managerName : undefined,
          assignedAt: assignee ? assignedAt : undefined,
          escalationCount: 0,
        };
        return updatedRecord;
      }),
    }));
    if (updatedRecord) {
      void saveLeaverRecord(updatedRecord);
      toast.success(
        assignee
          ? `Leaver assigned to ${assignee}`
          : "Assignment cleared",
      );
    }
  }

  function assignTransferRecord(
    department: string,
    id: number,
    assignee: string,
  ) {
    const assignedAt = new Date();
    let updatedRecord: TransferRecord | null = null;
    setTeamTransfers((queues) => ({
      ...queues,
      [department]: (queues[department] ?? []).map((record) => {
        if (record.id !== id) {
          return record;
        }
        updatedRecord = {
          ...record,
          assignedTo: assignee || undefined,
          assignedBy: assignee ? managerName : undefined,
          assignedAt: assignee ? assignedAt : undefined,
          escalationCount: 0,
        };
        return updatedRecord;
      }),
    }));
    if (updatedRecord) {
      void saveTransferRecord(updatedRecord);
      toast.success(
        assignee
          ? `Transfer assigned to ${assignee}`
          : "Assignment cleared",
      );
    }
  }

  function assignSupportWorker(referralId: number, supportWorker: string) {
    let updatedRecord: ReferralRecord | null = null;
    setDriverQueue((records) =>
      records.map((record) => {
        if (record.id !== referralId) {
          return record;
        }
        const nextRecord: ReferralRecord = {
          ...record,
          supportWorker: supportWorker || undefined,
        };
        updatedRecord = nextRecord;
        return nextRecord;
      }),
    );
    setHistory((records) =>
      records.map((record) => {
        if (record.id !== referralId) {
          return record;
        }
        const nextRecord: ReferralRecord = {
          ...record,
          supportWorker: supportWorker || undefined,
        };
        updatedRecord = nextRecord;
        return nextRecord;
      }),
    );
    setTeamNewReferrals((queues) => {
      const nextQueues = { ...queues };
      Object.keys(nextQueues).forEach((department) => {
        nextQueues[department] = (nextQueues[department] ?? []).map((record) =>
          record.id === referralId
            ? { ...record, supportWorker: supportWorker || undefined }
            : record,
        );
      });
      return nextQueues;
    });
    if (updatedRecord) {
      void saveReferralRecord(updatedRecord);
      toast.success(
        supportWorker
          ? `Support worker set to ${supportWorker}`
          : "Support worker cleared",
      );
    }
  }

  function formatSecuredProperty(record: ReferralRecord | TeamReferralRecord) {
    if (!record.currentProperty.trim()) {
      return "No property recorded";
    }

    return `${record.currentProperty} | Room ${
      record.currentRoomNumber || "Not recorded"
    }`;
  }

  function formatReferralSummary(record: TeamReferralRecord) {
    return [
      `Tenant Name: ${record.fullName}`,
      `Phone Number: ${record.phoneNumber || "Not recorded"}`,
      `Age: ${record.age || "Not recorded"}`,
      `Family Members Below Age 10: ${record.familyMembersBelow10 || "0"}`,
      `National Insurance Number: ${record.niNumber || "Not recorded"}`,
      `Last Reported Income Amount: £${record.incomeAmount || "0"}`,
      `Secured Property Address: ${record.currentProperty || "Not recorded"}`,
      `Room Number: ${record.currentRoomNumber || "Not recorded"}`,
      `Department: ${record.department}`,
    ].join("\n");
  }

  function formatLeaverDetails(record: LeaverRecord) {
    const details = [
      `Name: ${record.name}`,
      `NI Number: ${record.niNumber || "Not recorded"}`,
      `Property Address: ${record.propertyAddress}`,
      `Room Number: ${record.roomNumber}`,
      `Leaving Date: ${formatDisplayDate(record.leavingDate)}`,
    ];

    if (!record.department || record.department === "Maintenance Team") {
      details.splice(
        4,
        0,
        `Maintenance Works Required: ${
          record.maintenanceWorksRequired || "Not recorded"
        }`,
      );
      details.push(
        `Cleaning Option: ${
          record.cleaningType === "maintenance"
            ? "Maintenance & Cleaning"
            : "Cleaning"
        }`,
        `Assigned Date: ${
          record.assignedJobDate
            ? formatDisplayDate(record.assignedJobDate)
            : "Not assigned"
        }`,
      );
    }

    return details.join("\n");
  }

  function formatTransferDetails(record: TransferRecord) {
    const details = [
      `Name: ${record.name}`,
      `NI Number: ${record.niNumber || "Not recorded"}`,
      `Current Property: ${record.currentProperty}`,
      `Current Room Number: ${record.currentRoomNumber}`,
      `Transfer Date: ${formatDisplayDate(record.transferDate)}`,
    ];

    if (record.department !== "Maintenance Team") {
      details.push(
        `New Property Address: ${record.newPropertyAddress}`,
        `New Room Number: ${record.newRoomNumber}`,
      );
    }

    if (!record.department || record.department === "Maintenance Team") {
      details.push(
        `Old Room Maintenance Work: ${
          record.oldRoomMaintenanceWork || "Not recorded"
        }`,
        `Cleaning Option: ${
          record.cleaningType === "maintenance"
            ? "Maintenance & Cleaning"
            : "Cleaning"
        }`,
        `Assigned Date: ${
          record.assignedJobDate
            ? formatDisplayDate(record.assignedJobDate)
            : "Not assigned"
        }`,
        `Maintenance Photos Attached: ${
          record.hasMaintenancePhotos ? "Yes" : "No"
        }`,
        `Maintenance Videos Attached: ${
          record.hasMaintenanceVideos ? "Yes" : "No"
        }`,
      );
    }

    return details.join("\n");
  }

  function formatTransferSummary(record: TransferRecord) {
    if (record.department === "Maintenance Team") {
      return `${record.currentProperty} | Room ${record.currentRoomNumber} | NI ${record.niNumber || "N/A"} | Old room maintenance`;
    }

    return `${record.currentProperty} Room ${record.currentRoomNumber} to ${record.newPropertyAddress} Room ${record.newRoomNumber} | NI ${record.niNumber || "N/A"}`;
  }

  function formatMaintenanceLeaverHeading(record: LeaverRecord) {
    return `Room ${record.roomNumber}, ${record.propertyAddress}`;
  }

  function formatMaintenanceTransferHeading(record: TransferRecord) {
    return `Room ${record.currentRoomNumber}, ${record.currentProperty}`;
  }

  function formatMaintenanceLeaverDetails(record: LeaverRecord) {
    return [
      `Room Number: ${record.roomNumber}`,
      `Address: ${record.propertyAddress}`,
      `Leaving Date: ${formatDisplayDate(record.leavingDate)}`,
      `Maintenance Works Required: ${
        record.maintenanceWorksRequired || "Not recorded"
      }`,
      `Cleaning Option: ${
        record.cleaningType === "maintenance"
          ? "Maintenance & Cleaning"
          : "Cleaning"
      }`,
      `Assigned Date: ${
        record.assignedJobDate
          ? formatDisplayDate(record.assignedJobDate)
          : "Not assigned"
      }`,
    ].join("\n");
  }

  function formatMaintenanceTransferDetails(record: TransferRecord) {
    return [
      `Current Room Number: ${record.currentRoomNumber}`,
      `Current Address: ${record.currentProperty}`,
      `Transfer Date: ${formatDisplayDate(record.transferDate)}`,
      `Old Room Maintenance Work: ${
        record.oldRoomMaintenanceWork || "Not recorded"
      }`,
      `Cleaning Option: ${
        record.cleaningType === "maintenance"
          ? "Maintenance & Cleaning"
          : "Cleaning"
      }`,
      `Assigned Date: ${
        record.assignedJobDate
          ? formatDisplayDate(record.assignedJobDate)
          : "Not assigned"
      }`,
      `Maintenance Photos Attached: ${
        record.hasMaintenancePhotos ? "Yes" : "No"
      }`,
      `Maintenance Videos Attached: ${
        record.hasMaintenanceVideos ? "Yes" : "No"
      }`,
    ].join("\n");
  }

  function getBoardSearchValue(key: string) {
    return boardSearch[key] ?? "";
  }

  function setBoardSearchValue(key: string, value: string) {
    setBoardSearch((previous) => ({ ...previous, [key]: value }));
  }

  function getMaintenanceEvidenceKey(type: "leaver" | "transfer", id: number) {
    return `${type}-${id}`;
  }

  function updateMaintenanceEvidence(
    type: "leaver" | "transfer",
    id: number,
    updates: Partial<{ hasPhotos: boolean; hasVideos: boolean }>,
  ) {
    const key = getMaintenanceEvidenceKey(type, id);
    setMaintenanceCompletionEvidence((current) => ({
      ...current,
      [key]: {
        hasPhotos: current[key]?.hasPhotos ?? false,
        hasVideos: current[key]?.hasVideos ?? false,
        ...updates,
      },
    }));
  }

  function matchesBoardSearch(
    key: string,
    ...parts: Array<string | number | null | undefined>
  ) {
    const query = getBoardSearchValue(key).trim().toLowerCase();
    if (!query) {
      return true;
    }

    return parts
      .filter((value): value is string | number => value !== null && value !== undefined)
      .some((value) => String(value).toLowerCase().includes(query));
  }

  function formatFullHistoryDetails(
    record: ReferralRecord | TeamReferralRecord | LeaverRecord | TransferRecord,
  ) {
    if ("currentProperty" in record && "newPropertyAddress" in record) {
      return formatTransferDetails(record);
    }

    if ("propertyAddress" in record) {
      return formatLeaverDetails(record);
    }

    const teamDetails =
      "department" in record
        ? [
            `Department: ${record.department}`,
            `Team Outcome: ${record.teamOutcome ?? "Not recorded"}`,
            `Team Rejection Reason: ${
              record.teamRejectionReason || "Not recorded"
            }`,
          ]
        : [];

    return [
      `Tenant Name: ${record.fullName}`,
      `Phone Number: ${record.phoneNumber || "Not recorded"}`,
      `Age: ${record.age || "Not recorded"}`,
      `Date of Birth: ${record.dateOfBirth || "Not recorded"}`,
      `Family Members Below Age 10: ${record.familyMembersBelow10 || "0"}`,
      `National Insurance Number: ${record.niNumber || "Not recorded"}`,
      `Last Reported Income Amount: £${record.incomeAmount || "0"}`,
      `Secured Property Address: ${record.currentProperty || "Not recorded"}`,
      `Room Number: ${record.currentRoomNumber || "Not recorded"}`,
      `Referral Status: ${record.status}`,
      `Reasons: ${record.reasons.length > 0 ? record.reasons.join(" ") : "None"}`,
      `Driver Rejection Reason: ${record.rejectionReason || "Not recorded"}`,
      ...teamDetails,
    ].join("\n");
  }

  function getHistoryStatusLabel(
    record: ReferralRecord | TeamReferralRecord | LeaverRecord | TransferRecord,
  ) {
    if ("propertyAddress" in record) {
      return "Leaver";
    }

    if ("currentProperty" in record && "newPropertyAddress" in record) {
      return "Transfer";
    }

    if ("teamOutcome" in record && record.teamOutcome) {
      if (record.teamOutcome === "awaiting-information") {
        return "Awaiting information";
      }

      return record.teamOutcome === "uploaded" ? "Uploaded" : "Rejected";
    }

    if (record.status === "secured") {
      return "Secured";
    }

    if (record.status === "viewing-ended") {
      return "Viewing ended";
    }

    if (record.status === "follow-up") {
      return "Follow up";
    }

    return record.status === "failed" ? "Failed" : "Passed";
  }

  function getRecordTitle(
    record: ReferralRecord | TeamReferralRecord | LeaverRecord | TransferRecord,
  ) {
    return "name" in record ? record.name : record.fullName;
  }

  function completeTeamReferral(
    department: string,
    record: TeamReferralRecord,
    outcome: TeamReferralRecord["teamOutcome"],
  ) {
    const key = `${department}-${record.id}`;
    const rejectionReason = teamRejectionReasons[key]?.trim() ?? "";

    if (
      (outcome === "rejected" || outcome === "awaiting-information") &&
      !rejectionReason
    ) {
      return;
    }

    const completedRecord: TeamReferralRecord = {
      ...record,
      teamOutcome: outcome,
      teamRejectionReason: outcome === "uploaded" ? "" : rejectionReason,
      escalationPausedAt:
        outcome === "awaiting-information" ? new Date() : undefined,
      handledAt: new Date(),
    };

    if (outcome === "awaiting-information") {
      setTeamNewReferrals((queues) => ({
        ...queues,
        [department]: (queues[department] ?? []).map((item) =>
          item.id === record.id ? completedRecord : item,
        ),
      }));
    } else {
      setTeamNewReferrals((queues) => ({
        ...queues,
        [department]: (queues[department] ?? []).filter(
          (item) => item.id !== record.id,
        ),
      }));

      setTeamHistory((records) => ({
        ...records,
        [department]: [completedRecord, ...(records[department] ?? [])],
      }));
      setSelectedHistoryDetail(null);
    }

    void updateSupabaseTeamStatus("referrals", record.id, department, outcome);
    if (outcome !== "awaiting-information") {
      void updateMondayTeamStatus("referrals", record, department, outcome);
    }

    const outcomeLabel =
      outcome === "uploaded"
        ? "Marked uploaded"
        : outcome === "awaiting-information"
          ? "Marked awaiting information"
          : outcome === "rejected"
            ? "Referral cancelled"
            : "Updated";
    toast.success(outcomeLabel, {
      description: `${record.fullName} - ${department}`,
    });
  }

  async function handleLeaverSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let leaverRecord: LeaverRecord = {
      id: Date.now(),
      supportOfficerName: leaverSupportOfficerName,
      name: leaverName.trim(),
      niNumber: leaverNiNumber.trim(),
      propertyAddress: leaverPropertyAddress.trim(),
      roomNumber: leaverRoomNumber.trim(),
      leavingDate: leaverLeavingDate,
      cleaningType: "",
      maintenanceWorksRequired: "",
      hasMaintenancePhotos: false,
      hasMaintenanceVideos: false,
      createdAt: new Date(),
    };

    const mondayItemId = await createMondayItem("create-leaver", leaverRecord);
    leaverRecord = { ...leaverRecord, mondayItemId };

    setSupportLeaverHistory((records) => [leaverRecord, ...records]);
    void saveLeaverRecord(leaverRecord);

    setInspectorLeavers((records) => [leaverRecord, ...records]);

    setTeamLeavers((queues) => {
      const nextQueues = { ...queues };

      leaverTargetModules.forEach((module) => {
        nextQueues[module] = [
          { ...leaverRecord, department: module },
          ...(nextQueues[module] ?? []),
        ];
      });

      return nextQueues;
    });

    resetLeaverForm();
    setSelectedSupportAction(null);

    toast.success("Leaver submitted", {
      description: `${leaverRecord.name} - sent to Inspector and teams`,
    });
  }

  async function handleTransferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let transferRecord: TransferRecord = {
      id: Date.now(),
      supportOfficerName: transferSupportOfficerName,
      name: transferName.trim(),
      niNumber: transferNiNumber.trim(),
      currentProperty: transferCurrentProperty.trim(),
      currentRoomNumber: transferCurrentRoomNumber.trim(),
      transferDate,
      newPropertyAddress: transferNewPropertyAddress.trim(),
      newRoomNumber: transferNewRoomNumber.trim(),
      cleaningType: "",
      oldRoomMaintenanceWork: "",
      hasMaintenancePhotos: false,
      hasMaintenanceVideos: false,
      createdAt: new Date(),
    };

    const mondayItemId = await createMondayItem(
      "create-transfer",
      transferRecord,
    );
    transferRecord = { ...transferRecord, mondayItemId };

    setSupportTransferHistory((records) => [transferRecord, ...records]);
    void saveTransferRecord(transferRecord);

    setInspectorTransfers((records) => [transferRecord, ...records]);

    setTeamTransfers((queues) => {
      const nextQueues = { ...queues };

      leaverTargetModules.forEach((module) => {
        nextQueues[module] = [
          { ...transferRecord, department: module },
          ...(nextQueues[module] ?? []),
        ];
      });

      return nextQueues;
    });

    resetTransferForm();
    setSelectedSupportAction(null);

    toast.success("Transfer submitted", {
      description: `${transferRecord.name} - sent to Inspector and teams`,
    });
  }

  function markTeamTransferUpdated(department: string, record: TransferRecord) {
    const scheduleKey = `${department}-${record.id}`;
    const assignedDate = leaverScheduleDates[scheduleKey]?.assignedDate;

    if (department === "Maintenance Team" && !assignedDate) {
      return;
    }

    const completedRecord: TransferRecord = {
      ...record,
      assignedJobDate: assignedDate,
    };

    setTeamTransfers((queues) => ({
      ...queues,
      [department]: (queues[department] ?? []).filter(
        (item) => item.id !== record.id,
      ),
    }));

    if (department === "Maintenance Team") {
      setMaintenancePendingTransfers((records) => [completedRecord, ...records]);
    } else {
      setTeamTransferHistory((queues) => ({
        ...queues,
        [department]: [completedRecord, ...(queues[department] ?? [])],
      }));
    }

    void updateSupabaseTeamStatus(
      "transfers",
      record.id,
      department,
      department === "Maintenance Team" ? "assigned" : "updated",
      { assignedDate },
    );
    void updateMondayTeamStatus(
      "transfers",
      completedRecord,
      department,
      department === "Maintenance Team" ? "assigned" : "updated",
      { noticeDate: record.transferDate, assignedDate },
    );
    void saveTransferRecord(completedRecord);

    setSelectedHistoryDetail(null);

    toast.success(
      department === "Maintenance Team"
        ? "Transfer assigned"
        : "Transfer updated",
      { description: `${record.name} - ${department}` },
    );
  }

  function markTeamLeaverUpdated(department: string, record: LeaverRecord) {
    const scheduleKey = `${department}-${record.id}`;
    const schedule = leaverScheduleDates[scheduleKey] ?? {};

    if (department === "Maintenance Team") {
      if (!schedule.assignedDate) {
        return;
      }
    }

    const completedRecord: LeaverRecord = {
      ...record,
      assignedJobDate: schedule.assignedDate,
      cleaningScheduledDate: schedule.assignedDate,
    };

    setTeamLeavers((queues) => ({
      ...queues,
      [department]: (queues[department] ?? []).filter(
        (item) => item.id !== record.id,
      ),
    }));

    if (department === "Maintenance Team") {
      setMaintenancePendingLeavers((records) => [completedRecord, ...records]);
    } else {
      setTeamLeaverHistory((queues) => ({
        ...queues,
        [department]: [completedRecord, ...(queues[department] ?? [])],
      }));
    }

    void updateSupabaseTeamStatus(
      "leavers",
      record.id,
      department,
      department === "Maintenance Team" ? "assigned" : "updated",
      { assignedDate: schedule.assignedDate },
    );
    void updateMondayTeamStatus(
      "leavers",
      completedRecord,
      department,
      department === "Maintenance Team" ? "assigned" : "updated",
      { noticeDate: record.leavingDate, assignedDate: schedule.assignedDate },
    );
    void saveLeaverRecord(completedRecord);

    setSelectedHistoryDetail(null);

    toast.success(
      department === "Maintenance Team" ? "Leaver assigned" : "Leaver updated",
      { description: `${record.name} - ${department}` },
    );
  }

  function completeMaintenancePendingJob(
    record: LeaverRecord | TransferRecord,
    type: "leaver" | "transfer",
  ) {
    const evidenceKey = getMaintenanceEvidenceKey(type, record.id);
    const evidence = maintenanceCompletionEvidence[evidenceKey];
    if (!evidence?.hasPhotos || !evidence?.hasVideos) {
      return;
    }

    if (type === "leaver" && "propertyAddress" in record) {
      const completedRecord: LeaverRecord = {
        ...record,
        hasMaintenancePhotos: true,
        hasMaintenanceVideos: true,
      };
      setMaintenancePendingLeavers((records) =>
        records.filter((item) => item.id !== record.id),
      );
      setTeamLeaverHistory((queues) => ({
        ...queues,
        "Maintenance Team": [
          { ...completedRecord, department: "Maintenance Team" },
          ...(queues["Maintenance Team"] ?? []),
        ],
      }));
      setMaintenanceCompletionEvidence((current) => {
        const next = { ...current };
        delete next[evidenceKey];
        return next;
      });
      void updateSupabaseTeamStatus(
        "leavers",
        record.id,
        "Maintenance Team",
        "completed",
      );
      void updateMondayTeamStatus(
        "leavers",
        completedRecord,
        "Maintenance Team",
        "completed",
      );
      void saveLeaverRecord(completedRecord);
      return;
    }

    if (type === "transfer" && "currentProperty" in record) {
      const completedRecord: TransferRecord = {
        ...record,
        hasMaintenancePhotos: true,
        hasMaintenanceVideos: true,
      };
      setMaintenancePendingTransfers((records) =>
        records.filter((item) => item.id !== record.id),
      );
      setTeamTransferHistory((queues) => ({
        ...queues,
        "Maintenance Team": [
          { ...completedRecord, department: "Maintenance Team" },
          ...(queues["Maintenance Team"] ?? []),
        ],
      }));
      setMaintenanceCompletionEvidence((current) => {
        const next = { ...current };
        delete next[evidenceKey];
        return next;
      });
      void updateSupabaseTeamStatus(
        "transfers",
        record.id,
        "Maintenance Team",
        "completed",
      );
      void updateMondayTeamStatus(
        "transfers",
        completedRecord,
        "Maintenance Team",
        "completed",
      );
      void saveTransferRecord(completedRecord);
    }
  }

  function isLeaverRecord(
    record: LeaverRecord | TransferRecord,
  ): record is LeaverRecord {
    return (
      "propertyAddress" in record && !("newPropertyAddress" in record)
    );
  }

  function inspectionPropertyAddress(record: LeaverRecord | TransferRecord) {
    return isLeaverRecord(record)
      ? record.propertyAddress
      : record.currentProperty;
  }

  function inspectionRoomNumber(record: LeaverRecord | TransferRecord) {
    return isLeaverRecord(record) ? record.roomNumber : record.currentRoomNumber;
  }

  function openInspectionForm(record: LeaverRecord | TransferRecord) {
    setSelectedInspectionTarget(record);
    setInspectionDraft([
      { id: Date.now(), description: "", photoCount: 0, videoCount: 0 },
    ]);
  }

  function closeInspectionForm() {
    setSelectedInspectionTarget(null);
    setInspectionDraft([]);
  }

  function addInspectionProblem() {
    setInspectionDraft((problems) => [
      ...problems,
      { id: Date.now(), description: "", photoCount: 0, videoCount: 0 },
    ]);
  }

  function updateInspectionProblem(
    id: number,
    updates: Partial<InspectionProblem>,
  ) {
    setInspectionDraft((problems) =>
      problems.map((problem) =>
        problem.id === id ? { ...problem, ...updates } : problem,
      ),
    );
  }

  function removeInspectionProblem(id: number) {
    setInspectionDraft((problems) =>
      problems.filter((problem) => problem.id !== id),
    );
  }

  function completeInspection(record: LeaverRecord | TransferRecord) {
    const cleanProblems = inspectionDraft.filter(
      (problem) => problem.description.trim().length > 0,
    );
    if (cleanProblems.length === 0) {
      toast.error("Add at least one problem", {
        description: "Each problem needs a description before submitting.",
      });
      return;
    }

    const report: InspectionReport = {
      problems: cleanProblems,
      completedAt: new Date(),
      inspectorName,
    };

    if (isLeaverRecord(record)) {
      const completed: LeaverRecord = { ...record, inspectionReport: report };
      setInspectorLeavers((records) =>
        records.filter((item) => item.id !== record.id),
      );
      setInspectorHistory((records) => [completed, ...records]);
      setTeamLeavers((queues) => ({
        ...queues,
        "Maintenance Team": [
          { ...completed, department: "Maintenance Team" },
          ...(queues["Maintenance Team"] ?? []),
        ],
      }));
      void saveLeaverRecord(completed);
    } else {
      const completed: TransferRecord = { ...record, inspectionReport: report };
      setInspectorTransfers((records) =>
        records.filter((item) => item.id !== record.id),
      );
      setInspectorHistory((records) => [completed, ...records]);
      setTeamTransfers((queues) => ({
        ...queues,
        "Maintenance Team": [
          { ...completed, department: "Maintenance Team" },
          ...(queues["Maintenance Team"] ?? []),
        ],
      }));
      void saveTransferRecord(completed);
    }

    closeInspectionForm();
    toast.success("Inspection complete", {
      description: `${inspectionPropertyAddress(record)} sent to Maintenance Team`,
    });
  }

  function handleReferralSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (referralStep < totalReferralSteps) {
      setReferralStep((currentStep) => currentStep + 1);
      setEligibilityResult(null);
      return;
    }

    const failureReasons = [];
    const documentFailureReasons = [];

    if (Number(age) < 18) {
      failureReasons.push("Age must be 18 or over.");
    }

    if (!niNumber.trim()) {
      const reason = "NI Number is required.";
      failureReasons.push(reason);
      documentFailureReasons.push(reason);
    }

    if (Number(incomeAmount) <= 0) {
      const reason = "Proof of income amount must be above £0.";
      failureReasons.push(reason);
      documentFailureReasons.push(reason);
    }

    if (failureReasons.length === 0) {
      const record = createReferralRecord("driver", []);
      setFollowUps((records) =>
        records.filter((followUp) => followUp.id !== editingFollowUpId),
      );
      setDriverQueue((records) => [record, ...records]);
      void saveReferralRecord(record);
      setEligibilityResult({
        status: "passed",
        reasons: [],
        title: "Passed initial eligibility requirements",
        message:
          "The tenant has been sent to the Referral Officer incoming queue for property assignment.",
      });
      toast.success("Referral submitted", {
        description: `${record.fullName} sent to Referral Officer queue`,
      });
      return;
    }

    if (editingFollowUpId) {
      const record = createReferralRecord("failed", failureReasons);
      setFollowUps((records) =>
        records.filter((followUp) => followUp.id !== editingFollowUpId),
      );
      setHistory((records) => [record, ...records]);
      void saveReferralRecord(record);
      setEligibilityResult({
        status: "failed",
        reasons: failureReasons,
        title: "Moved to History as failed referral",
        message:
          "The referral was checked again and still failed the requirements.",
      });
      return;
    }

    if (
      documentFailureReasons.length > 0 &&
      !failureReasons.includes("Age must be 18 or over.")
    ) {
      const record = createReferralRecord("follow-up", documentFailureReasons);
      setFollowUps((records) => [record, ...records]);
      void saveReferralRecord(record);
      setEligibilityResult({
        status: "follow-up",
        reasons: documentFailureReasons,
        title: "Moved to Follow ups",
        message:
          "This referral needs NI Number or proof of income follow-up. Two reminders have been scheduled every 2 days.",
      });
      return;
    }

    const record = createReferralRecord("failed", failureReasons);
    setHistory((records) => [record, ...records]);
    void saveReferralRecord(record);
    setEligibilityResult({
      status: "failed",
      reasons: failureReasons,
      title: "Moved to History as failed referral",
      message:
        "This referral failed requirements that cannot be fixed through document follow-up.",
    });
  }

  return (
    <main className="module-page">
      <Toaster
        closeButton
        position="top-right"
        richColors
        theme="dark"
        toastOptions={{
          style: {
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            color: "var(--foreground)",
          },
        }}
      />
      <div className="background-bubble bubble-one" />
      <div className="background-bubble bubble-two" />
      <div className="background-bubble bubble-three" />

      {eligibilityResult && isNewReferral ? (
        <section className="eligibility-screen">
          <div className={`eligibility-card ${eligibilityResult.status}`}>
            <span>
              {eligibilityResult.status === "follow-up"
                ? "Follow up"
                : eligibilityResult.status === "passed"
                  ? "Passed"
                  : "Failed"}
            </span>
            <h1>{eligibilityResult.title}</h1>
            {eligibilityResult.message && <p>{eligibilityResult.message}</p>}
            {eligibilityResult.reasons.length > 0 && (
              <ul>
                {eligibilityResult.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <button
              className="submit-button"
              onClick={() => {
                setSelectedReceptionAction(null);
                resetReferralForm();
              }}
              type="button"
            >
              Go home
            </button>
          </div>
        </section>
      ) : (
      <section className="module-shell">
        {showOptionsBanner && (
          <div className="module-hero">
            <div>
              <p className="eyebrow">Internal Support Platform</p>
              <h1>{selectedModule ?? "Select your module"}</h1>
              <p className="hero-copy">
                {isReceptionist
                  ? "Choose what you want to manage from the reception desk."
                  : isReferralOfficer
                    ? "Handle incoming tenants from reception, assign property first, then complete back filling."
                    : isSupportOfficer
                      ? "Create leavers, transfers, and view support history."
                    : isProcessingModule
                      ? "Manage secured property referrals sent from the driver workflow."
                  : "Choose the team area you want to work in. Each module will later connect to the relevant Monday.com board workflow."}
              </p>
            </div>
            <div className="hero-badge">
              <span>
                {isReceptionist
                  ? "R"
                  : isReferralOfficer
                    ? "RO"
                    : isSupportOfficer
                      ? "SO"
                    : isProcessingModule
                      ? getInitials(selectedModule ?? "")
                      : assignedModules.length}
              </span>
              <small>
                {isReceptionist
                  ? "reception"
                  : isReferralOfficer
                    ? "referral officer"
                    : isSupportOfficer
                      ? "support"
                    : isProcessingModule
                      ? "team"
                      : "team modules"}
              </small>
            </div>
          </div>
        )}

        {!selectedModule ? (
          <div className="module-grid">
            {assignedModules.map((module, index) => (
              <OptionCard
                index={index}
                key={module}
                label={module}
                onClick={() => {
                  goForward(() => {
                    setSelectedModule(module);
                    setSelectedReceptionAction(null);
                    setSelectedDriverAction(null);
                    setSelectedProcessingAction(null);
                    setSelectedProcessingHistoryAction(null);
                    setSelectedSupportAction(null);
                    setSelectedSupportHistoryAction(null);
                    setSelectedInspectorAction(null);
                    setSelectedInspectionTarget(null);
                    setInspectionDraft([]);
                    setSelectedInspectorHistoryRecord(null);
                  });
                }}
              />
            ))}
          </div>
        ) : isReferralOfficer && !selectedDriverAction ? (
          <>
            <div className="reception-actions">
              <BackButton
                onClick={() => {
                  goBack(() => {
                    setSelectedModule(null);
                    setSelectedDriverAction(null);
                  });
                }}
              >
                Back to modules
              </BackButton>
            </div>
            <div className="module-grid">
              {referralOfficerOptions.map((option, index) => (
                <OptionCard
                  index={index}
                  key={option}
                  label={option}
                  onClick={() => {
                    setSelectedDriverAction(option);
                    setSelectedProcessingAction(
                      option === "Back filling" ? "New Referral" : null,
                    );
                    setSelectedProcessingHistoryAction(null);
                  }}
                />
              ))}
            </div>
          </>
        ) : isReferralOfficer &&
          selectedDriverAction === "Incoming from Reception" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => setSelectedDriverAction(null)}
              type="button"
            >
              Back to referral officer options
            </button>
            <div className="records-heading">
              <h2>Incoming from Reception</h2>
              <p>
                Assign a property and room for each tenant passed from reception.
              </p>
            </div>
            <div className="records-list">
              {driverQueue.length === 0 ? (
                <p className="empty-records">No incoming referrals yet.</p>
              ) : (
                driverQueue.map((record) => (
                  <article className="record-card" key={record.id}>
                    <div>
                      <span className="record-status driver">Referral Officer</span>
                      <h3>{record.fullName}</h3>
                      <p>
                        Phone: {record.phoneNumber || "Missing"} | Age:{" "}
                        {record.age || "Not set"} | Number of children &lt;10:{" "}
                        {record.familyMembersBelow10 || "0"}
                      </p>
                    </div>
                    <>
                        <label className="field">
                          <span>
                            {record.rejectedPropertyCount > 0
                              ? "Another property"
                              : "Property taking them to"}
                          </span>
                          <input
                            onChange={(event) =>
                              updateDriverRecord(record.id, {
                                currentProperty: event.target.value,
                              })
                            }
                            placeholder="Enter property address/name"
                            type="text"
                            value={record.currentProperty}
                          />
                        </label>
                        <label className="field">
                          <span>Room number</span>
                          <input
                            onChange={(event) =>
                              updateDriverRecord(record.id, {
                                currentRoomNumber: event.target.value,
                              })
                            }
                            placeholder="Enter room number"
                            type="text"
                            value={record.currentRoomNumber}
                          />
                        </label>

                        {record.propertyAccepted ? (
                          <div className="signature-panel">
                            <label className="field file-field">
                              <span>Signature photo *</span>
                              <input
                                accept="image/*"
                                capture="environment"
                                type="file"
                              />
                              <small>
                                Take a photo of the signed viewing form.
                              </small>
                            </label>
                            <button
                              className="submit-button compact-button"
                              onClick={() =>
                                void moveDriverReferralToHistory(
                                  record,
                                  "secured",
                                )
                              }
                              type="button"
                            >
                              Finish as secured
                            </button>
                          </div>
                        ) : (
                          <>
                            {record.rejectedPropertyCount > 0 && (
                              <label className="field">
                                <span>Reason they did not like the property</span>
                                <textarea
                                  onChange={(event) =>
                                    updateDriverRecord(record.id, {
                                      rejectionReason: event.target.value,
                                    })
                                  }
                                  placeholder="Enter reason"
                                  rows={3}
                                  value={record.rejectionReason}
                                />
                              </label>
                            )}
                            <div className="driver-actions">
                              <button
                                className="submit-button compact-button"
                                disabled={
                                  !record.currentProperty.trim() ||
                                  !record.currentRoomNumber.trim()
                                }
                                onClick={() =>
                                  updateDriverRecord(record.id, {
                                    propertyAccepted: true,
                                  })
                                }
                                type="button"
                              >
                                Accepted property
                              </button>
                              <button
                                className="secondary-button danger-button"
                                disabled={
                                  !record.currentProperty.trim() ||
                                  !record.currentRoomNumber.trim() ||
                                  (record.rejectedPropertyCount > 0 &&
                                    !record.rejectionReason.trim())
                                }
                                onClick={() => rejectDriverProperty(record)}
                                type="button"
                              >
                                {record.rejectedPropertyCount > 0
                                  ? "End viewing"
                                  : "Rejected property"}
                              </button>
                            </div>
                          </>
                        )}
                    </>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : isReferralOfficer && selectedDriverAction === "History" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => setSelectedDriverAction(null)}
              type="button"
            >
              Back to referral officer options
            </button>
            <div className="records-heading">
              <h2>Referral Officer History</h2>
              <p>Completed incoming referrals are stored here.</p>
            </div>
            <div className="records-list">
              {selectedHistoryDetail && (
                <HistoryDetailPanel
                  details={formatFullHistoryDetails(selectedHistoryDetail)}
                  onAction={() => setSelectedHistoryDetail(null)}
                  title={getRecordTitle(selectedHistoryDetail)}
                />
              )}
              {history.filter(
                (record) =>
                  record.status === "secured" ||
                  record.status === "viewing-ended",
              ).length === 0 ? (
                <p className="empty-records">No referral officer history yet.</p>
              ) : (
                history
                  .filter(
                    (record) =>
                      record.status === "secured" ||
                      record.status === "viewing-ended",
                  )
                  .map((record) => (
                    <button
                      className="history-row"
                      key={record.id}
                      onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                      type="button"
                    >
                      <span className={`record-status ${record.status}`}>
                        {getHistoryStatusLabel(record)}
                      </span>
                      <strong>{record.fullName}</strong>
                      <small>
                        {formatSecuredProperty(record)} |{" "}
                        {record.phoneNumber || "No phone"}
                      </small>
                    </button>
                  ))
              )}
            </div>
          </section>
        ) : isSupportOfficer && !selectedSupportAction ? (
          <>
            <div className="reception-actions">
              <button
                className="back-button"
                onClick={() => {
                  setSelectedModule(null);
                  setSelectedSupportAction(null);
                  setSelectedSupportHistoryAction(null);
                }}
                type="button"
              >
                Back to modules
              </button>
            </div>
            <div className="module-grid">
              {supportOptions.map((option, index) => (
                <OptionCard
                  index={index}
                  key={option}
                  label={option}
                  onClick={() => {
                    setSelectedSupportAction(option);
                    setSelectedSupportHistoryAction(null);
                  }}
                />
              ))}
            </div>
          </>
        ) : isSupportOfficer && selectedSupportAction === "Leaver" ? (
          <form className="intake-form" onSubmit={handleLeaverSubmit}>
            <div className="form-toolbar">
              <button
                aria-label="Back to support options"
                className="icon-back-button"
                onClick={() => {
                  setSelectedSupportAction(null);
                  resetLeaverForm();
                }}
                type="button"
              >
                ←
              </button>
              <div className="form-toolbar-title">
                <strong>Support leaver</strong>
                <small>Leaver details</small>
              </div>
              <p>* Mandatory</p>
            </div>

            <section className="form-section">
              <div className="section-heading">
                <span>01</span>
                <div>
                  <h2>Leaver form</h2>
                  <p>
                    Complete the leaver details and attach any maintenance
                    evidence.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <label className="field field-wide">
                  <span>Support Officer *</span>
                  <select
                    onChange={(event) =>
                      setLeaverSupportOfficerName(event.target.value)
                    }
                    required
                    value={leaverSupportOfficerName}
                  >
                    <option disabled value="">
                      Select support officer
                    </option>
                    {referralOfficers.map((officer) => (
                      <option key={officer} value={officer}>
                        {officer}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Name *</span>
                  <input
                    onChange={(event) => setLeaverName(event.target.value)}
                    placeholder="Enter name"
                    required
                    type="text"
                    value={leaverName}
                  />
                </label>
                <label className="field">
                  <span>National Insurance Number *</span>
                  <input
                    onChange={(event) => setLeaverNiNumber(event.target.value)}
                    placeholder="Enter NI number"
                    required
                    type="text"
                    value={leaverNiNumber}
                  />
                </label>

                <label className="field">
                  <span>Property Address *</span>
                  <input
                    onChange={(event) =>
                      setLeaverPropertyAddress(event.target.value)
                    }
                    placeholder="Enter property address"
                    required
                    type="text"
                    value={leaverPropertyAddress}
                  />
                </label>

                <label className="field">
                  <span>Room Number *</span>
                  <input
                    onChange={(event) => setLeaverRoomNumber(event.target.value)}
                    placeholder="Enter room number"
                    required
                    type="text"
                    value={leaverRoomNumber}
                  />
                </label>

                <label className="field">
                  <span>Leaving Date *</span>
                  <input
                    onChange={(event) => setLeaverLeavingDate(event.target.value)}
                    required
                    type="date"
                    value={leaverLeavingDate}
                  />
                </label>

              </div>
            </section>

            <div className="wizard-actions">
              <button className="submit-button" type="submit">
                Notified
              </button>
            </div>
          </form>
        ) : isSupportOfficer && selectedSupportAction === "History" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => {
                setSelectedSupportAction(null);
                setSelectedSupportHistoryAction(null);
                setSelectedHistoryDetail(null);
              }}
              type="button"
            >
              Back to support options
            </button>
            <div className="records-heading">
              <h2>Support History</h2>
              <p>Choose which support history list to view.</p>
            </div>
            {!selectedSupportHistoryAction ? (
              <div className="module-grid compact-grid">
                {supportHistoryOptions.map((option, index) => (
                  <OptionCard
                    index={index}
                    key={option}
                    label={option}
                    onClick={() => setSelectedSupportHistoryAction(option)}
                  />
                ))}
              </div>
            ) : (
              <div className="records-list">
                <button
                  className="back-button"
                  onClick={() => {
                    setSelectedSupportHistoryAction(null);
                    setSelectedHistoryDetail(null);
                  }}
                  type="button"
                >
                  Back to history options
                </button>
                <label className="board-search">
                  <span>Search</span>
                  <input
                    onChange={(event) =>
                      setBoardSearchValue(
                        `support-history-${selectedSupportHistoryAction?.toLowerCase() ?? "all"}`,
                        event.target.value,
                      )
                    }
                    placeholder="Search support history records"
                    type="text"
                    value={getBoardSearchValue(
                      `support-history-${selectedSupportHistoryAction?.toLowerCase() ?? "all"}`,
                    )}
                  />
                </label>
                {selectedHistoryDetail && (
                  <section className="history-detail">
                    <button
                      aria-label="Close details"
                      className="detail-close"
                      onClick={() => goBack(() => setSelectedHistoryDetail(null))}
                      type="button"
                    >
                      ×
                    </button>
                    <div>
                      <span className="record-status driver">Details</span>
                      <h3>
                        {"name" in selectedHistoryDetail
                          ? selectedHistoryDetail.name
                          : selectedHistoryDetail.fullName}
                      </h3>
                    </div>
                    <textarea
                      readOnly
                      rows={10}
                      value={formatFullHistoryDetails(selectedHistoryDetail)}
                    />
                  </section>
                )}
                {selectedSupportHistoryAction === "Transfer" ? (
                  supportTransferHistory.filter((record) =>
                    matchesBoardSearch(
                      `support-history-${selectedSupportHistoryAction?.toLowerCase() ?? "all"}`,
                      record.name,
                      record.currentProperty,
                      record.currentRoomNumber,
                      record.newPropertyAddress,
                      record.newRoomNumber,
                      record.transferDate,
                    ),
                  ).length === 0 ? (
                    <p className="empty-records">No transfer history yet.</p>
                  ) : (
                    supportTransferHistory
                      .filter((record) =>
                        matchesBoardSearch(
                          `support-history-${selectedSupportHistoryAction?.toLowerCase() ?? "all"}`,
                          record.name,
                          record.currentProperty,
                          record.currentRoomNumber,
                          record.newPropertyAddress,
                          record.newRoomNumber,
                          record.transferDate,
                        ),
                      )
                      .map((record) => (
                      <button
                        className="history-row"
                        key={record.id}
                        onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                        type="button"
                      >
                        <span className="record-status driver">Transfer</span>
                        <strong>{record.name}</strong>
                        <small>{formatTransferSummary(record)}</small>
                      </button>
                      ))
                  )
                ) : supportLeaverHistory.filter((record) =>
                    matchesBoardSearch(
                      `support-history-${selectedSupportHistoryAction?.toLowerCase() ?? "all"}`,
                      record.name,
                      record.propertyAddress,
                      record.roomNumber,
                      record.leavingDate,
                    ),
                  ).length === 0 ? (
                  <p className="empty-records">No leaver history yet.</p>
                ) : (
                  supportLeaverHistory
                    .filter((record) =>
                      matchesBoardSearch(
                        `support-history-${selectedSupportHistoryAction?.toLowerCase() ?? "all"}`,
                        record.name,
                        record.propertyAddress,
                        record.roomNumber,
                        record.leavingDate,
                      ),
                    )
                    .map((record) => (
                    <button
                      className="history-row"
                      key={record.id}
                      onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                      type="button"
                    >
                      <span className="record-status driver">Leaver</span>
                      <strong>{record.name}</strong>
                      <small>
                        {record.propertyAddress} | Room {record.roomNumber}
                      </small>
                    </button>
                    ))
                )}
              </div>
            )}
          </section>
        ) : isSupportOfficer && selectedSupportAction === "Transfer" ? (
          <form className="intake-form compact-form" onSubmit={handleTransferSubmit}>
            <button
              className="back-button"
              onClick={() => {
                resetTransferForm();
                setSelectedSupportAction(null);
              }}
              type="button"
            >
              Back to support options
            </button>
            <div className="form-section">
              <div className="section-heading">
                <span>SO</span>
                <h2>Transfer</h2>
                <p>
                  Record the tenant move and notify every team in their
                  Transfers section.
                </p>
              </div>
              <div className="form-grid">
                <label className="field field-wide">
                  <span>Support Officer *</span>
                  <select
                    onChange={(event) =>
                      setTransferSupportOfficerName(event.target.value)
                    }
                    required
                    value={transferSupportOfficerName}
                  >
                    <option disabled value="">
                      Select support officer
                    </option>
                    {referralOfficers.map((officer) => (
                      <option key={officer} value={officer}>
                        {officer}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Name *</span>
                  <input
                    onChange={(event) => setTransferName(event.target.value)}
                    required
                    type="text"
                    value={transferName}
                  />
                </label>
                <label className="field">
                  <span>National Insurance Number *</span>
                  <input
                    onChange={(event) => setTransferNiNumber(event.target.value)}
                    placeholder="Enter NI number"
                    required
                    type="text"
                    value={transferNiNumber}
                  />
                </label>
                <label className="field">
                  <span>Current Property *</span>
                  <input
                    onChange={(event) =>
                      setTransferCurrentProperty(event.target.value)
                    }
                    required
                    type="text"
                    value={transferCurrentProperty}
                  />
                </label>
                <label className="field">
                  <span>Current Room Number *</span>
                  <input
                    onChange={(event) =>
                      setTransferCurrentRoomNumber(event.target.value)
                    }
                    required
                    type="text"
                    value={transferCurrentRoomNumber}
                  />
                </label>
                <label className="field">
                  <span>Transfer Date *</span>
                  <input
                    onChange={(event) => setTransferDate(event.target.value)}
                    required
                    type="date"
                    value={transferDate}
                  />
                </label>
                <label className="field">
                  <span>New Property Address *</span>
                  <input
                    onChange={(event) =>
                      setTransferNewPropertyAddress(event.target.value)
                    }
                    required
                    type="text"
                    value={transferNewPropertyAddress}
                  />
                </label>
                <label className="field">
                  <span>New Room Number *</span>
                  <input
                    onChange={(event) =>
                      setTransferNewRoomNumber(event.target.value)
                    }
                    required
                    type="text"
                    value={transferNewRoomNumber}
                  />
                </label>
              </div>
            </div>
            <div className="wizard-actions">
              <button className="submit-button" type="submit">
                Notified
              </button>
            </div>
          </form>
        ) : isProcessingModule && !selectedProcessingAction ? (
          <>
            <div className="reception-actions">
              <button
                className="back-button"
                onClick={() => {
                  setSelectedModule(null);
                  setSelectedProcessingAction(null);
                  setSelectedProcessingHistoryAction(null);
                }}
                type="button"
              >
                Back to modules
              </button>
            </div>
            <div className="module-grid">
              {processingOptions
                .filter(
                  (option) =>
                    selectedModule === "Maintenance Team"
                      ? option !== "New Referral"
                      : option !== "Pending Jobs",
                )
                .map((option, index) => (
                  (() => {
                    const badge = getProcessingOptionBadge(option);

                    return (
                      <OptionCard
                        alert={badge.alert}
                        badgeCount={badge.count}
                        index={index}
                        key={option}
                        label={option}
                        onClick={() => {
                          setSelectedProcessingAction(option);
                          setSelectedProcessingHistoryAction(null);
                        }}
                      />
                    );
                  })()
                ))}
            </div>
          </>
        ) : (isProcessingModule && selectedProcessingAction === "New Referral") ||
          (isReferralOfficer && selectedDriverAction === "Back filling") ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => {
                if (isReferralOfficer) {
                  setSelectedDriverAction(null);
                  setSelectedProcessingAction(null);
                } else {
                  setSelectedProcessingAction(null);
                }
              }}
              type="button"
            >
              Back to {isReferralOfficer ? "referral officer" : selectedModule} options
            </button>
            <div className="records-heading">
              <h2>
                {isReferralOfficer
                  ? "Referral Officer Back filling"
                  : `${selectedModule} New Referrals`}
              </h2>
              <p>
                {isReferralOfficer
                  ? "Complete back filling for referrals after property assignment."
                  : "Secured property referrals from Referral Officer appear here with tenant details and document placeholders."}
              </p>
            </div>
            <div className="records-list">
              <label className="board-search">
                <span>Search</span>
                <input
                  onChange={(event) =>
                    setBoardSearchValue("processing-new-referrals", event.target.value)
                  }
                  placeholder="Search by tenant, property, room, or department"
                  type="text"
                  value={getBoardSearchValue("processing-new-referrals")}
                />
              </label>
              {selectedHistoryDetail &&
                "fullName" in selectedHistoryDetail &&
                "department" in selectedHistoryDetail && (
                  <section className="history-detail">
                    <button
                      aria-label="Close details"
                      className="detail-close"
                      onClick={() => goBack(() => setSelectedHistoryDetail(null))}
                      type="button"
                    >
                      ×
                    </button>
                    <div>
                      <span className="record-status driver">Details</span>
                      <h3>{selectedHistoryDetail.fullName}</h3>
                    </div>

                    <label className="field field-wide">
                      <span>Tenant Information</span>
                      <textarea
                        readOnly
                        rows={8}
                        value={formatReferralSummary(selectedHistoryDetail)}
                      />
                    </label>

                    <div className="document-grid">
                      <div className="document-card">
                        <span>ID Photo</span>
                        <strong>Captured at reception</strong>
                      </div>
                      <div className="document-card">
                        <span>Proof of Income</span>
                        <strong>Captured at reception</strong>
                      </div>
                      <div className="document-card">
                        <span>Signature Photo</span>
                        <strong>Captured by driver</strong>
                      </div>
                    </div>

                    <label className="field">
                      <span>Cancellation reason</span>
                      <textarea
                        onChange={(event) =>
                          setTeamRejectionReasons((reasons) => ({
                            ...reasons,
                            [`${selectedModule}-${selectedHistoryDetail.id}`]:
                              event.target.value,
                          }))
                        }
                        placeholder="Required for awaiting info or cancelled"
                        rows={3}
                        value={
                          teamRejectionReasons[
                            `${selectedModule}-${selectedHistoryDetail.id}`
                          ] ?? ""
                        }
                      />
                    </label>

                    <div className="driver-actions">
                      <button
                        className="submit-button compact-button"
                        onClick={() =>
                          completeTeamReferral(
                            selectedModule ?? "",
                            selectedHistoryDetail,
                            "uploaded",
                          )
                        }
                        type="button"
                      >
                        Uploaded
                      </button>
                      <button
                        className="secondary-button dark-secondary-button"
                        disabled={
                          !teamRejectionReasons[
                            `${selectedModule}-${selectedHistoryDetail.id}`
                          ]?.trim()
                        }
                        onClick={() =>
                          completeTeamReferral(
                            selectedModule ?? "",
                            selectedHistoryDetail,
                            "awaiting-information",
                          )
                        }
                        type="button"
                      >
                        Awaiting information
                      </button>
                      <button
                        className="secondary-button danger-button"
                        disabled={
                          !teamRejectionReasons[
                            `${selectedModule}-${selectedHistoryDetail.id}`
                          ]?.trim()
                        }
                        onClick={() =>
                          completeTeamReferral(
                            selectedModule ?? "",
                            selectedHistoryDetail,
                            "rejected",
                          )
                        }
                        type="button"
                      >
                        Cancel referral
                      </button>
                    </div>
                  </section>
                )}
              {(
                teamNewReferrals[selectedModule ?? ""] ?? []
              ).filter((record) =>
                matchesBoardSearch(
                  "processing-new-referrals",
                  record.fullName,
                  record.currentProperty,
                  record.currentRoomNumber,
                  record.department,
                ),
              ).length === 0 ? (
                <p className="empty-records">No new referrals yet.</p>
              ) : (
                (teamNewReferrals[selectedModule ?? ""] ?? [])
                  .filter((record) =>
                    matchesBoardSearch(
                      "processing-new-referrals",
                      record.fullName,
                      record.currentProperty,
                      record.currentRoomNumber,
                      record.department,
                    ),
                  )
                  .map((record) => {
                  const sla = getEscalationStatus(
                    selectedModule ?? "",
                    record,
                  );
                  return (
                    <button
                      className={`history-row queue-row ${
                        sla.level === "overdue" ? "urgent-record" : ""
                      }`}
                      key={record.id}
                      onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                      type="button"
                    >
                      <span className="record-status driver">New referral</span>
                      <strong>{record.fullName}</strong>
                      <span className={`sla-badge ${sla.level}`}>
                        {sla.label}
                      </span>
                      <small>
                        {formatSecuredProperty(record)} | {record.department}
                      </small>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        ) : isProcessingModule && selectedProcessingAction === "History" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => {
                setSelectedProcessingAction(null);
                setSelectedProcessingHistoryAction(null);
              }}
              type="button"
            >
              Back to {selectedModule} options
            </button>
            <div className="records-heading">
              <h2>{selectedModule} History</h2>
              <p>Choose which history list to view.</p>
            </div>
            {!selectedProcessingHistoryAction ? (
              <div className="module-grid compact-grid">
                {processingHistoryOptions
                  .filter((option) =>
                    selectedModule === "Referral Officer"
                      ? option !== "Leavers"
                      : true,
                  )
                  .map((option, index) => (
                  <OptionCard
                    index={index}
                    key={option}
                    label={option}
                    onClick={() => setSelectedProcessingHistoryAction(option)}
                  />
                ))}
              </div>
            ) : (
              <div className="records-list">
                <button
                  className="back-button"
                  onClick={() => setSelectedProcessingHistoryAction(null)}
                  type="button"
                >
                  Back to history options
                </button>
                <label className="board-search">
                  <span>Search</span>
                  <input
                    onChange={(event) =>
                      setBoardSearchValue(
                        `processing-history-${selectedProcessingHistoryAction?.toLowerCase() ?? "all"}`,
                        event.target.value,
                      )
                    }
                    placeholder="Search history records"
                    type="text"
                    value={getBoardSearchValue(
                      `processing-history-${selectedProcessingHistoryAction?.toLowerCase() ?? "all"}`,
                    )}
                  />
                </label>
                {selectedHistoryDetail && (
                  <section className="history-detail">
                    <button
                      aria-label="Close details"
                      className="detail-close"
                      onClick={() => goBack(() => setSelectedHistoryDetail(null))}
                      type="button"
                    >
                      ×
                    </button>
                    <div>
                      <span className="record-status driver">Details</span>
                      <h3>
                        {"name" in selectedHistoryDetail
                          ? selectedHistoryDetail.name
                          : selectedHistoryDetail.fullName}
                      </h3>
                    </div>
                    <textarea
                      readOnly
                      rows={12}
                      value={formatFullHistoryDetails(selectedHistoryDetail)}
                    />
                  </section>
                )}
                {selectedProcessingHistoryAction === "Leavers" ? (
                  (teamLeaverHistory[selectedModule ?? ""] ?? []).length ===
                  0 ? (
                    <p className="empty-records">No leaver history yet.</p>
                  ) : (
                    (teamLeaverHistory[selectedModule ?? ""] ?? [])
                      .filter((record) =>
                        matchesBoardSearch(
                          `processing-history-${selectedProcessingHistoryAction?.toLowerCase() ?? "all"}`,
                          record.name,
                          record.propertyAddress,
                          record.roomNumber,
                          record.leavingDate,
                        ),
                      )
                      .map((record) => (
                        <button
                          className="history-row"
                          key={record.id}
                          onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                          type="button"
                        >
                          <span className="record-status driver">Leaver</span>
                          <strong>{record.name}</strong>
                          <small>
                            {record.propertyAddress} | Room {record.roomNumber}
                          </small>
                        </button>
                      ))
                  )
                ) : selectedProcessingHistoryAction === "Transfers" ? (
                  (teamTransferHistory[selectedModule ?? ""] ?? []).length ===
                  0 ? (
                    <p className="empty-records">No transfer history yet.</p>
                  ) : (
                    (teamTransferHistory[selectedModule ?? ""] ?? [])
                      .filter((record) =>
                        matchesBoardSearch(
                          `processing-history-${selectedProcessingHistoryAction?.toLowerCase() ?? "all"}`,
                          record.name,
                          record.currentProperty,
                          record.currentRoomNumber,
                          record.newPropertyAddress,
                          record.newRoomNumber,
                          record.transferDate,
                        ),
                      )
                      .map((record) => (
                        <button
                          className="history-row"
                          key={record.id}
                          onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                          type="button"
                        >
                          <span className="record-status driver">Transfer</span>
                          <strong>{record.name}</strong>
                          <small>{formatTransferSummary(record)}</small>
                        </button>
                      ))
                  )
                ) : (teamHistory[selectedModule ?? ""] ?? []).length === 0 ? (
                  <p className="empty-records">No new referral history yet.</p>
                ) : (
                  (teamHistory[selectedModule ?? ""] ?? [])
                    .filter((record) =>
                      matchesBoardSearch(
                        `processing-history-${selectedProcessingHistoryAction?.toLowerCase() ?? "all"}`,
                        record.fullName,
                        record.currentProperty,
                        record.currentRoomNumber,
                        record.department,
                        record.teamOutcome,
                      ),
                    )
                    .map((record) => (
                      <button
                        className="history-row"
                        key={record.id}
                        onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                        type="button"
                      >
                        <span className={`record-status ${record.teamOutcome}`}>
                          {getHistoryStatusLabel(record)}
                        </span>
                        <strong>{record.fullName}</strong>
                        <small>
                          {formatSecuredProperty(record)} | {record.department}
                        </small>
                      </button>
                    ))
                )}
              </div>
            )}
          </section>
        ) : isProcessingModule && selectedProcessingAction === "Pending Jobs" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => setSelectedProcessingAction(null)}
              type="button"
            >
              Back to {selectedModule} options
            </button>
            <div className="records-heading">
              <h2>Maintenance Pending Jobs</h2>
              <p>Assigned leaver and transfer jobs waiting to be completed.</p>
            </div>
            <div className="records-list">
              <label className="board-search">
                <span>Search</span>
                <input
                  onChange={(event) =>
                    setBoardSearchValue("maintenance-pending-jobs", event.target.value)
                  }
                  placeholder="Search by name, property, room, or assigned date"
                  type="text"
                  value={getBoardSearchValue("maintenance-pending-jobs")}
                />
              </label>
              {maintenancePendingCount === 0 ? (
                <p className="empty-records">No pending jobs yet.</p>
              ) : (
                <>
                  {maintenancePendingLeavers
                    .filter((record) =>
                      matchesBoardSearch(
                        "maintenance-pending-jobs",
                        record.name,
                        record.propertyAddress,
                        record.roomNumber,
                        record.assignedJobDate,
                      ),
                    )
                    .map((record) => (
                    (() => {
                      const evidenceKey = getMaintenanceEvidenceKey(
                        "leaver",
                        record.id,
                      );
                      const evidence =
                        maintenanceCompletionEvidence[evidenceKey] ?? {
                          hasPhotos: false,
                          hasVideos: false,
                        };

                      return (
                    <article
                      className={`record-card ${
                        isTodayOrOverdue(record.assignedJobDate)
                          ? "urgent-record"
                          : ""
                      }`}
                      key={`leaver-${record.id}`}
                    >
                      <div>
                        <span className="record-status driver">Leaver</span>
                        <h3>{record.name}</h3>
                        <p>
                          {record.propertyAddress} | Room {record.roomNumber}
                          <br />
                          Assigned date: {formatDisplayDate(record.assignedJobDate)}
                        </p>
                      </div>
                      <button
                        className="submit-button compact-button"
                        disabled={!evidence.hasPhotos || !evidence.hasVideos}
                        onClick={() =>
                          completeMaintenancePendingJob(record, "leaver")
                        }
                        type="button"
                      >
                        Job done
                      </button>
                      <div className="form-grid">
                        <label className="field file-field">
                          <span>Attach completion photos *</span>
                          <input
                            accept="image/*"
                            capture="environment"
                            onChange={(event) =>
                              updateMaintenanceEvidence("leaver", record.id, {
                                hasPhotos: (event.target.files?.length ?? 0) > 0,
                              })
                            }
                            type="file"
                          />
                        </label>
                        <label className="field file-field">
                          <span>Attach completion videos *</span>
                          <input
                            accept="video/*"
                            capture="environment"
                            onChange={(event) =>
                              updateMaintenanceEvidence("leaver", record.id, {
                                hasVideos: (event.target.files?.length ?? 0) > 0,
                              })
                            }
                            type="file"
                          />
                        </label>
                      </div>
                    </article>
                      );
                    })()
                  ))}
                  {maintenancePendingTransfers
                    .filter((record) =>
                      matchesBoardSearch(
                        "maintenance-pending-jobs",
                        record.name,
                        record.currentProperty,
                        record.currentRoomNumber,
                        record.newPropertyAddress,
                        record.newRoomNumber,
                        record.assignedJobDate,
                      ),
                    )
                    .map((record) => (
                    (() => {
                      const evidenceKey = getMaintenanceEvidenceKey(
                        "transfer",
                        record.id,
                      );
                      const evidence =
                        maintenanceCompletionEvidence[evidenceKey] ?? {
                          hasPhotos: false,
                          hasVideos: false,
                        };

                      return (
                    <article
                      className={`record-card ${
                        isTodayOrOverdue(record.assignedJobDate)
                          ? "urgent-record"
                          : ""
                      }`}
                      key={`transfer-${record.id}`}
                    >
                      <div>
                        <span className="record-status driver">Transfer</span>
                        <h3>{record.name}</h3>
                        <p>
                          {formatTransferSummary(record)}
                          <br />
                          Assigned date: {formatDisplayDate(record.assignedJobDate)}
                        </p>
                      </div>
                      <button
                        className="submit-button compact-button"
                        disabled={!evidence.hasPhotos || !evidence.hasVideos}
                        onClick={() =>
                          completeMaintenancePendingJob(record, "transfer")
                        }
                        type="button"
                      >
                        Job done
                      </button>
                      <div className="form-grid">
                        <label className="field file-field">
                          <span>Attach completion photos *</span>
                          <input
                            accept="image/*"
                            capture="environment"
                            onChange={(event) =>
                              updateMaintenanceEvidence("transfer", record.id, {
                                hasPhotos: (event.target.files?.length ?? 0) > 0,
                              })
                            }
                            type="file"
                          />
                        </label>
                        <label className="field file-field">
                          <span>Attach completion videos *</span>
                          <input
                            accept="video/*"
                            capture="environment"
                            onChange={(event) =>
                              updateMaintenanceEvidence("transfer", record.id, {
                                hasVideos: (event.target.files?.length ?? 0) > 0,
                              })
                            }
                            type="file"
                          />
                        </label>
                      </div>
                    </article>
                      );
                    })()
                  ))}
                </>
              )}
            </div>
          </section>
        ) : isProcessingModule && selectedProcessingAction === "Transfers" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => {
                setSelectedProcessingAction(null);
                setSelectedHistoryDetail(null);
              }}
              type="button"
            >
              Back to {selectedModule} options
            </button>
            <div className="records-heading">
              <h2>{selectedModule} Transfers</h2>
              <p>Transfer records submitted by Support Officer appear here.</p>
            </div>
            <div className="records-list">
              <label className="board-search">
                <span>Search</span>
                <input
                  onChange={(event) =>
                    setBoardSearchValue("processing-transfers", event.target.value)
                  }
                  placeholder="Search by name, property, room, or date"
                  type="text"
                  value={getBoardSearchValue("processing-transfers")}
                />
              </label>
              {selectedHistoryDetail &&
                "currentProperty" in selectedHistoryDetail &&
                "newPropertyAddress" in selectedHistoryDetail && (
                  <section className="history-detail">
                    <button
                      aria-label="Close details"
                      className="detail-close"
                      onClick={() => goBack(() => setSelectedHistoryDetail(null))}
                      type="button"
                    >
                      ×
                    </button>
                    <div>
                      <span className="record-status driver">Details</span>
                      <h3>
                        {selectedModule === "Maintenance Team"
                          ? formatMaintenanceTransferHeading(selectedHistoryDetail)
                          : selectedHistoryDetail.name}
                      </h3>
                    </div>
                    <textarea
                      readOnly
                      rows={10}
                      value={
                        selectedModule === "Maintenance Team"
                          ? formatMaintenanceTransferDetails(selectedHistoryDetail)
                          : formatFullHistoryDetails(selectedHistoryDetail)
                      }
                    />
                    {selectedModule === "Maintenance Team" &&
                      selectedHistoryDetail.inspectionReport && (
                        <section className="form-section">
                          <div className="section-heading">
                            <span>IN</span>
                            <div>
                              <h2>Inspection report</h2>
                              <p>
                                Captured by{" "}
                                {selectedHistoryDetail.inspectionReport
                                  .inspectorName ?? "Inspector"}{" "}
                                on{" "}
                                {formatDisplayDate(
                                  selectedHistoryDetail.inspectionReport.completedAt,
                                )}
                                .
                              </p>
                            </div>
                          </div>
                          {selectedHistoryDetail.inspectionReport.problems.map(
                            (problem, index) => (
                              <article
                                className="record-card"
                                key={`maint-transfer-${problem.id}`}
                              >
                                <div>
                                  <span className="record-status driver">
                                    Problem {index + 1}
                                  </span>
                                  <p>{problem.description}</p>
                                </div>
                                <ul>
                                  <li>Photos attached: {problem.photoCount}</li>
                                  <li>Videos attached: {problem.videoCount}</li>
                                </ul>
                              </article>
                            ),
                          )}
                        </section>
                      )}
                    {selectedModule === "Maintenance Team" && (
                      <label className="field">
                        <span>Assigned date *</span>
                        <input
                          onChange={(event) =>
                            setLeaverScheduleDates((dates) => ({
                              ...dates,
                              [`${selectedModule}-${selectedHistoryDetail.id}`]: {
                                ...dates[
                                  `${selectedModule}-${selectedHistoryDetail.id}`
                                ],
                                assignedDate: event.target.value,
                              },
                            }))
                          }
                          required
                          type="date"
                          value={
                            leaverScheduleDates[
                              `${selectedModule}-${selectedHistoryDetail.id}`
                            ]?.assignedDate ?? ""
                          }
                        />
                      </label>
                    )}
                    <button
                      className="secondary-button dark-secondary-button"
                      disabled={
                        selectedModule === "Maintenance Team" &&
                        !leaverScheduleDates[
                          `${selectedModule}-${selectedHistoryDetail.id}`
                        ]?.assignedDate
                      }
                      onClick={() =>
                        selectedModule
                          ? markTeamTransferUpdated(
                              selectedModule,
                              selectedHistoryDetail,
                            )
                          : setSelectedHistoryDetail(null)
                      }
                      type="button"
                    >
                      {selectedModule === "Maintenance Team"
                        ? "Assigned"
                        : "Updated"}
                    </button>
                  </section>
                )}
              {(
                teamTransfers[selectedModule ?? ""] ?? []
              ).filter((record) =>
                matchesBoardSearch(
                  "processing-transfers",
                  record.name,
                  record.currentProperty,
                  record.currentRoomNumber,
                  record.newPropertyAddress,
                  record.newRoomNumber,
                  record.transferDate,
                ),
              ).length === 0 ? (
                <p className="empty-records">No transfers yet.</p>
              ) : (
                (teamTransfers[selectedModule ?? ""] ?? [])
                  .filter((record) =>
                    matchesBoardSearch(
                      "processing-transfers",
                      record.name,
                      record.currentProperty,
                      record.currentRoomNumber,
                      record.newPropertyAddress,
                      record.newRoomNumber,
                      record.transferDate,
                    ),
                  )
                  .map((record) => {
                  const sla = getEscalationStatus(selectedModule ?? "", record);
                  return (
                    <button
                      className={`history-row queue-row ${
                        sla.level === "overdue" ? "urgent-record" : ""
                      }`}
                      key={record.id}
                      onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                      type="button"
                    >
                      <span className="record-status driver">Transfer</span>
                      <strong>
                        {selectedModule === "Maintenance Team"
                          ? formatMaintenanceTransferHeading(record)
                          : record.name}
                      </strong>
                      <span className={`sla-badge ${sla.level}`}>
                        {sla.label}
                      </span>
                      <small>
                        {selectedModule === "Maintenance Team"
                          ? `Room ${record.newRoomNumber}, ${record.newPropertyAddress}`
                          : formatTransferSummary(record)}
                      </small>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        ) : isProcessingModule && selectedProcessingAction === "Leavers" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => setSelectedProcessingAction(null)}
              type="button"
            >
              Back to {selectedModule} options
            </button>
            <div className="records-heading">
              <h2>{selectedModule} Leavers</h2>
              <p>Leaver records submitted by Support Officer appear here.</p>
            </div>
            <div className="records-list">
              <label className="board-search">
                <span>Search</span>
                <input
                  onChange={(event) =>
                    setBoardSearchValue("processing-leavers", event.target.value)
                  }
                  placeholder="Search by name, property, room, or date"
                  type="text"
                  value={getBoardSearchValue("processing-leavers")}
                />
              </label>
              {selectedHistoryDetail && (
                <section className="history-detail">
                  <button
                    aria-label="Close details"
                    className="detail-close"
                    onClick={() => goBack(() => setSelectedHistoryDetail(null))}
                    type="button"
                  >
                    ×
                  </button>
                  <div>
                    <span className="record-status driver">Details</span>
                    <h3>
                      {selectedModule === "Maintenance Team" &&
                      "propertyAddress" in selectedHistoryDetail
                        ? formatMaintenanceLeaverHeading(selectedHistoryDetail)
                        : "name" in selectedHistoryDetail
                        ? selectedHistoryDetail.name
                        : selectedHistoryDetail.fullName}
                    </h3>
                  </div>
                  <textarea
                    readOnly
                    rows={10}
                    value={
                      selectedModule === "Maintenance Team" &&
                      "propertyAddress" in selectedHistoryDetail
                        ? formatMaintenanceLeaverDetails(selectedHistoryDetail)
                        : formatFullHistoryDetails(selectedHistoryDetail)
                    }
                  />
                  {selectedModule === "Maintenance Team" &&
                    "propertyAddress" in selectedHistoryDetail &&
                    selectedHistoryDetail.inspectionReport && (
                      <section className="form-section">
                        <div className="section-heading">
                          <span>IN</span>
                          <div>
                            <h2>Inspection report</h2>
                            <p>
                              Captured by{" "}
                              {selectedHistoryDetail.inspectionReport
                                .inspectorName ?? "Inspector"}{" "}
                              on{" "}
                              {formatDisplayDate(
                                selectedHistoryDetail.inspectionReport.completedAt,
                              )}
                              .
                            </p>
                          </div>
                        </div>
                        {selectedHistoryDetail.inspectionReport.problems.map(
                          (problem, index) => (
                            <article
                              className="record-card"
                              key={`maint-leaver-${problem.id}`}
                            >
                              <div>
                                <span className="record-status driver">
                                  Problem {index + 1}
                                </span>
                                <p>{problem.description}</p>
                              </div>
                              <ul>
                                <li>Photos attached: {problem.photoCount}</li>
                                <li>Videos attached: {problem.videoCount}</li>
                              </ul>
                            </article>
                          ),
                        )}
                      </section>
                    )}
                  {selectedModule === "Maintenance Team" &&
                    "propertyAddress" in selectedHistoryDetail && (
                      <div className="form-grid">
                        <div className="document-card">
                          <span>Photos attached</span>
                          <strong>
                            {selectedHistoryDetail.hasMaintenancePhotos
                              ? "Yes"
                              : "No"}
                          </strong>
                        </div>
                        <div className="document-card">
                          <span>Videos attached</span>
                          <strong>
                            {selectedHistoryDetail.hasMaintenanceVideos
                              ? "Yes"
                              : "No"}
                          </strong>
                        </div>
                        <label className="field field-wide">
                          <span>Assigned date *</span>
                          <input
                            onChange={(event) =>
                              setLeaverScheduleDates((dates) => ({
                                ...dates,
                                [`${selectedModule}-${selectedHistoryDetail.id}`]: {
                                  ...dates[
                                    `${selectedModule}-${selectedHistoryDetail.id}`
                                  ],
                                  assignedDate: event.target.value,
                                },
                              }))
                            }
                            required
                            type="date"
                            value={
                              leaverScheduleDates[
                                `${selectedModule}-${selectedHistoryDetail.id}`
                              ]?.assignedDate ?? ""
                            }
                          />
                        </label>
                      </div>
                    )}
                  <button
                    className="secondary-button dark-secondary-button"
                    onClick={() =>
                      selectedModule &&
                      "propertyAddress" in selectedHistoryDetail
                        ? markTeamLeaverUpdated(
                            selectedModule,
                            selectedHistoryDetail,
                          )
                        : setSelectedHistoryDetail(null)
                    }
                    disabled={
                      selectedModule === "Maintenance Team" &&
                      "propertyAddress" in selectedHistoryDetail &&
                      (!leaverScheduleDates[
                        `${selectedModule}-${selectedHistoryDetail.id}`
                      ]?.assignedDate)
                    }
                    type="button"
                  >
                    {selectedModule === "Maintenance Team"
                      ? "Assigned"
                      : "Updated"}
                  </button>
                </section>
              )}
              {(
                teamLeavers[selectedModule ?? ""] ?? []
              ).filter((record) =>
                matchesBoardSearch(
                  "processing-leavers",
                  record.name,
                  record.propertyAddress,
                  record.roomNumber,
                  record.leavingDate,
                ),
              ).length === 0 ? (
                <p className="empty-records">No leavers yet.</p>
              ) : (
                (teamLeavers[selectedModule ?? ""] ?? [])
                  .filter((record) =>
                    matchesBoardSearch(
                      "processing-leavers",
                      record.name,
                      record.propertyAddress,
                      record.roomNumber,
                      record.leavingDate,
                    ),
                  )
                  .map((record) => {
                  const sla = getEscalationStatus(selectedModule ?? "", record);
                  return (
                    <button
                      className={`history-row queue-row ${
                        sla.level === "overdue" ? "urgent-record" : ""
                      }`}
                      key={record.id}
                      onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                      type="button"
                    >
                      <span className="record-status driver">Leaver</span>
                      <strong>
                        {selectedModule === "Maintenance Team"
                          ? formatMaintenanceLeaverHeading(record)
                          : record.name}
                      </strong>
                      <span className={`sla-badge ${sla.level}`}>
                        {sla.label}
                      </span>
                      <small>
                        {selectedModule === "Maintenance Team"
                          ? `Room ${record.roomNumber}, ${record.propertyAddress}`
                          : `${record.propertyAddress} | Room ${record.roomNumber}`}
                      </small>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        ) : isManager ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => setSelectedModule(null)}
              type="button"
            >
              Back to modules
            </button>
            <div className="records-heading">
              <h2>Manager Dashboard</h2>
              <p>
                One command view for incoming referrals, team progress, reasons,
                and assignments.
              </p>
            </div>
            <div className="records-list">
              <div className="manager-kpi-grid">
                <article className="manager-kpi-card">
                  <strong>Incoming referrals</strong>
                  <span>
                    <KpiNumber value={driverQueue.length} />
                  </span>
                </article>
                <article className="manager-kpi-card">
                  <strong>Referral Officer dept</strong>
                  <span>
                    <KpiNumber
                      value={(teamNewReferrals["Referral Officer"] ?? []).length}
                    />
                  </span>
                </article>
                <article className="manager-kpi-card">
                  <strong>RMS dept</strong>
                  <span>
                    <KpiNumber
                      value={(teamNewReferrals["RMS Team"] ?? []).length}
                    />
                  </span>
                </article>
                <article className="manager-kpi-card">
                  <strong>Tenants Mgmt dept</strong>
                  <span>
                    <KpiNumber
                      value={
                        (teamNewReferrals["Tenants Management"] ?? []).length
                      }
                    />
                  </span>
                </article>
                <article className="manager-kpi-card">
                  <strong>HB Claims dept</strong>
                  <span>
                    <KpiNumber
                      value={(teamNewReferrals["HB Claims Team"] ?? []).length}
                    />
                  </span>
                </article>
                <article className="manager-kpi-card">
                  <strong>All queries tracked</strong>
                  <span>
                    <KpiNumber value={managerReferralRows.length} />
                  </span>
                </article>
                <article
                  className={`manager-kpi-card ${
                    managerOverdueCount > 0 ? "manager-kpi-card-alert" : ""
                  }`}
                >
                  <strong>Overdue tasks</strong>
                  <span>
                    <KpiNumber value={managerOverdueCount} />
                  </span>
                </article>
              </div>

              <section className="manager-team-section">
                <div className="manager-team-header">
                  <h3>General Dashboard</h3>
                  <small>All secured referrals and departmental progress</small>
                </div>
                {managerReferralRows.length === 0 ? (
                  <p className="empty-records">No referrals available yet.</p>
                ) : (
                  <div className="manager-table-wrap">
                    <table className="manager-table">
                      <thead>
                        <tr>
                          <th>Tenant</th>
                          <th>Incoming</th>
                          <th>Referral Officer</th>
                          <th>RMS</th>
                          <th>Tenants Mgmt</th>
                          <th>HB Claims</th>
                          <th>Support Worker</th>
                          <th>All acted?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managerReferralRows.map((row) => {
                          const getDeptSla = (department: string) => {
                            const teamRecord =
                              (teamNewReferrals[department] ?? []).find(
                                (item) => item.id === row.record.id,
                              ) ??
                              (teamHistory[department] ?? []).find(
                                (item) => item.id === row.record.id,
                              );
                            if (!teamRecord) {
                              return {
                                label: "Unassigned",
                                level: "unassigned" as EscalationLevel,
                              };
                            }
                            return getEscalationStatus(department, teamRecord);
                          };
                          const deptStatuses = managerDepartments.map(
                            (department) => ({
                              department,
                              sla: getDeptSla(department),
                            }),
                          );
                          const allActed = deptStatuses.every(
                            ({ sla }) => sla.level === "done",
                          );
                          return (
                            <tr
                              className={
                                selectedManagerReferralId === row.record.id ? "active" : ""
                              }
                              key={`manager-row-${row.record.id}`}
                              onClick={() => setSelectedManagerReferralId(row.record.id)}
                            >
                              <td>
                                <strong>{row.record.fullName}</strong>
                                <small>{row.record.phoneNumber || "No phone"}</small>
                              </td>
                              <td>
                                <span
                                  className={`sla-badge ${
                                    row.record.status === "driver"
                                      ? "on-time"
                                      : "done"
                                  }`}
                                >
                                  {row.record.status === "driver"
                                    ? "Pending"
                                    : "Done"}
                                </span>
                              </td>
                              {deptStatuses.map(({ department, sla }) => (
                                <td key={`${row.record.id}-${department}`}>
                                  <span className={`sla-badge ${sla.level}`}>
                                    {sla.label}
                                  </span>
                                </td>
                              ))}
                              <td>{row.record.supportWorker || "Unassigned"}</td>
                              <td>
                                <span
                                  className={`sla-badge ${
                                    allActed ? "done" : "awaiting"
                                  }`}
                                >
                                  {allActed ? "Yes" : "No"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {selectedManagerReferral ? (
                <section className="manager-team-section">
                  <div className="manager-team-header">
                    <h3>Referral Assignment Panel</h3>
                    <small>Assign departments and support worker from one place</small>
                  </div>
                  <article className="record-card">
                    <div className="manager-referral-details">
                      <div>
                        <strong>Tenant</strong>
                        <p>{selectedManagerReferral.record.fullName}</p>
                      </div>
                      <div>
                        <strong>Phone</strong>
                        <p>{selectedManagerReferral.record.phoneNumber || "Missing"}</p>
                      </div>
                      <div>
                        <strong>DOB</strong>
                        <p>{selectedManagerReferral.record.dateOfBirth || "Missing"}</p>
                      </div>
                      <div>
                        <strong>NI Number</strong>
                        <p>{selectedManagerReferral.record.niNumber || "Missing"}</p>
                      </div>
                      <div>
                        <strong>Income</strong>
                        <p>{selectedManagerReferral.record.incomeAmount || "0"}</p>
                      </div>
                      <div>
                        <strong>Property</strong>
                        <p>{formatSecuredProperty(selectedManagerReferral.record)}</p>
                      </div>
                    </div>
                    <div className="manager-assignment-grid">
                      <label className="field">
                        <span>Referral Officer</span>
                        <select
                          onChange={(event) => {
                            assignIncomingReferral(
                              selectedManagerReferral.record.id,
                              event.target.value,
                            );
                            assignTeamReferral(
                              "Referral Officer",
                              selectedManagerReferral.record.id,
                              event.target.value,
                            );
                          }}
                          value={
                            (teamNewReferrals["Referral Officer"] ?? []).find(
                              (item) => item.id === selectedManagerReferral.record.id,
                            )?.assignedTo ??
                            driverQueue.find(
                              (item) => item.id === selectedManagerReferral.record.id,
                            )?.assignedTo ??
                            ""
                          }
                        >
                          <option value="">Unassigned</option>
                          {(teamMembersByModule["Referral Officer"] ?? []).map((member) => (
                            <option key={member} value={member}>
                              {member}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>RMS Team</span>
                        <select
                          onChange={(event) =>
                            assignTeamReferral(
                              "RMS Team",
                              selectedManagerReferral.record.id,
                              event.target.value,
                            )
                          }
                          value={
                            (teamNewReferrals["RMS Team"] ?? []).find(
                              (item) => item.id === selectedManagerReferral.record.id,
                            )?.assignedTo ?? ""
                          }
                        >
                          <option value="">Unassigned</option>
                          {(teamMembersByModule["RMS Team"] ?? []).map((member) => (
                            <option key={member} value={member}>
                              {member}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Tenants Management</span>
                        <select
                          onChange={(event) =>
                            assignTeamReferral(
                              "Tenants Management",
                              selectedManagerReferral.record.id,
                              event.target.value,
                            )
                          }
                          value={
                            (teamNewReferrals["Tenants Management"] ?? []).find(
                              (item) => item.id === selectedManagerReferral.record.id,
                            )?.assignedTo ?? ""
                          }
                        >
                          <option value="">Unassigned</option>
                          {(teamMembersByModule["Tenants Management"] ?? []).map((member) => (
                            <option key={member} value={member}>
                              {member}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>HB Claims Team</span>
                        <select
                          onChange={(event) =>
                            assignTeamReferral(
                              "HB Claims Team",
                              selectedManagerReferral.record.id,
                              event.target.value,
                            )
                          }
                          value={
                            (teamNewReferrals["HB Claims Team"] ?? []).find(
                              (item) => item.id === selectedManagerReferral.record.id,
                            )?.assignedTo ?? ""
                          }
                        >
                          <option value="">Unassigned</option>
                          {(teamMembersByModule["HB Claims Team"] ?? []).map((member) => (
                            <option key={member} value={member}>
                              {member}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field field-wide">
                        <span>Support Worker</span>
                        <select
                          onChange={(event) =>
                            assignSupportWorker(
                              selectedManagerReferral.record.id,
                              event.target.value,
                            )
                          }
                          value={selectedManagerReferral.record.supportWorker ?? ""}
                        >
                          <option value="">Unassigned</option>
                          {supportWorkers.map((worker) => (
                            <option key={worker} value={worker}>
                              {worker}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="manager-reason-grid">
                      {managerDepartments.map((department) => (
                        <article className="document-card" key={`reason-${department}`}>
                          <span>{department}</span>
                          <strong>
                            {selectedManagerReferral.reasonByDepartment[department] ||
                              "No reason raised"}
                          </strong>
                        </article>
                      ))}
                    </div>
                  </article>
                </section>
              ) : (
                <p className="empty-records">
                  Select a referral from the dashboard table to assign departments.
                </p>
              )}
            </div>
          </section>
        ) : isInspector && !selectedInspectorAction ? (
          <>
            <div className="reception-actions">
              <BackButton
                onClick={() => {
                  goBack(() => {
                    setSelectedModule(null);
                    setSelectedInspectorAction(null);
                    closeInspectionForm();
                  });
                }}
              >
                Back to modules
              </BackButton>
            </div>
            <div className="module-grid">
              {inspectorOptions.map((option, index) => {
                const badgeCount =
                  option === "Leavers"
                    ? inspectorLeavers.length
                    : option === "Transfers"
                      ? inspectorTransfers.length
                      : inspectorHistory.length;
                return (
                  <OptionCard
                    badgeCount={badgeCount}
                    index={index}
                    key={option}
                    label={option}
                    onClick={() => {
                      goForward(() => {
                        setSelectedInspectorAction(option);
                        closeInspectionForm();
                        setSelectedInspectorHistoryRecord(null);
                      });
                    }}
                  />
                );
              })}
            </div>
          </>
        ) : isInspector &&
          (selectedInspectorAction === "Leavers" ||
            selectedInspectorAction === "Transfers") ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => {
                goBack(() => {
                  setSelectedInspectorAction(null);
                  closeInspectionForm();
                });
              }}
              type="button"
            >
              Back to Inspector options
            </button>
            <div className="records-heading">
              <h2>
                Inspector{" "}
                {selectedInspectorAction === "Leavers" ? "Leavers" : "Transfers"}
              </h2>
              <p>
                Properties waiting on a site inspection before Maintenance can
                start.
              </p>
            </div>
            <div className="records-list">
              <label className="board-search">
                <span>Search</span>
                <input
                  onChange={(event) =>
                    setBoardSearchValue(
                      `inspector-${selectedInspectorAction.toLowerCase()}`,
                      event.target.value,
                    )
                  }
                  placeholder="Search by property or room"
                  type="text"
                  value={getBoardSearchValue(
                    `inspector-${selectedInspectorAction.toLowerCase()}`,
                  )}
                />
              </label>
              {selectedInspectionTarget && (
                <section className="history-detail">
                  <button
                    aria-label="Close inspection form"
                    className="detail-close"
                    onClick={() => goBack(() => closeInspectionForm())}
                    type="button"
                  >
                    ×
                  </button>
                  <div>
                    <span className="record-status driver">Inspection</span>
                    <h3>
                      {inspectionPropertyAddress(selectedInspectionTarget)} | Room{" "}
                      {inspectionRoomNumber(selectedInspectionTarget)}
                    </h3>
                    <small>{selectedInspectionTarget.name}</small>
                  </div>

                  <section className="form-section">
                    <div className="section-heading">
                      <span>{inspectionDraft.length}</span>
                      <div>
                        <h2>Problems found</h2>
                        <p>
                          Add each issue separately with a description and the
                          number of photos and videos captured.
                        </p>
                      </div>
                    </div>

                    {inspectionDraft.map((problem, index) => (
                      <article className="record-card" key={problem.id}>
                        <div>
                          <span className="record-status driver">
                            Problem {index + 1}
                          </span>
                          {inspectionDraft.length > 1 && (
                            <button
                              className="back-button"
                              onClick={() =>
                                removeInspectionProblem(problem.id)
                              }
                              type="button"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="form-grid">
                          <label className="field field-wide">
                            <span>Description *</span>
                            <textarea
                              onChange={(event) =>
                                updateInspectionProblem(problem.id, {
                                  description: event.target.value,
                                })
                              }
                              placeholder="Describe the issue"
                              rows={3}
                              value={problem.description}
                            />
                          </label>
                          <label className="field file-field">
                            <span>
                              Photos attached
                              <em className="upload-count">
                                {problem.photoCount}
                              </em>
                            </span>
                            <input
                              accept="image/*"
                              multiple
                              onChange={(event) => {
                                const added = event.target.files?.length ?? 0;
                                if (added > 0) {
                                  updateInspectionProblem(problem.id, {
                                    photoCount: problem.photoCount + added,
                                  });
                                }
                                event.target.value = "";
                              }}
                              type="file"
                            />
                            <small>Tap to add more photos</small>
                          </label>
                          <label className="field file-field">
                            <span>
                              Videos attached
                              <em className="upload-count">
                                {problem.videoCount}
                              </em>
                            </span>
                            <input
                              accept="video/*"
                              multiple
                              onChange={(event) => {
                                const added = event.target.files?.length ?? 0;
                                if (added > 0) {
                                  updateInspectionProblem(problem.id, {
                                    videoCount: problem.videoCount + added,
                                  });
                                }
                                event.target.value = "";
                              }}
                              type="file"
                            />
                            <small>Tap to add more videos</small>
                          </label>
                        </div>
                      </article>
                    ))}

                    <div className="inspection-add-row">
                      <button
                        aria-label="Add another problem"
                        className="add-problem-button"
                        onClick={addInspectionProblem}
                        title="Add another problem"
                        type="button"
                      >
                        <svg
                          aria-hidden="true"
                          fill="none"
                          height="16"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2.2"
                          viewBox="0 0 24 24"
                          width="16"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <line x1="12" x2="12" y1="5" y2="19" />
                          <line x1="5" x2="19" y1="12" y2="12" />
                        </svg>
                      </button>
                    </div>
                    <div className="inspection-actions">
                      <button
                        className="submit-button"
                        disabled={
                          inspectionDraft.filter(
                            (problem) => problem.description.trim().length > 0,
                          ).length === 0
                        }
                        onClick={() =>
                          completeInspection(selectedInspectionTarget)
                        }
                        type="button"
                      >
                        Complete inspection
                      </button>
                    </div>
                  </section>
                </section>
              )}
              {(() => {
                const list =
                  selectedInspectorAction === "Leavers"
                    ? inspectorLeavers
                    : inspectorTransfers;
                const filtered = list.filter((record) =>
                  matchesBoardSearch(
                    `inspector-${selectedInspectorAction.toLowerCase()}`,
                    record.name,
                    inspectionPropertyAddress(record),
                    inspectionRoomNumber(record),
                  ),
                );
                if (filtered.length === 0) {
                  return (
                    <p className="empty-records">
                      No properties awaiting inspection.
                    </p>
                  );
                }
                return filtered.map((record) => (
                  <button
                    className="history-row"
                    key={`inspector-${selectedInspectorAction}-${record.id}`}
                    onClick={() => goForward(() => openInspectionForm(record))}
                    type="button"
                  >
                    <span className="record-status driver">
                      {selectedInspectorAction === "Leavers"
                        ? "Leaver"
                        : "Transfer"}
                    </span>
                    <strong>{inspectionPropertyAddress(record)}</strong>
                    <small>Room {inspectionRoomNumber(record)}</small>
                  </button>
                ));
              })()}
            </div>
          </section>
        ) : isInspector && selectedInspectorAction === "History" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => {
                goBack(() => {
                  setSelectedInspectorAction(null);
                  setSelectedInspectorHistoryRecord(null);
                });
              }}
              type="button"
            >
              Back to Inspector options
            </button>
            <div className="records-heading">
              <h2>Inspector History</h2>
              <p>Completed inspections sent on to the Maintenance Team.</p>
            </div>
            <div className="records-list">
              <label className="board-search">
                <span>Search</span>
                <input
                  onChange={(event) =>
                    setBoardSearchValue(
                      "inspector-history",
                      event.target.value,
                    )
                  }
                  placeholder="Search by property or room"
                  type="text"
                  value={getBoardSearchValue("inspector-history")}
                />
              </label>
              {selectedInspectorHistoryRecord &&
                selectedInspectorHistoryRecord.inspectionReport && (
                  <section className="history-detail">
                    <button
                      aria-label="Close inspection report"
                      className="detail-close"
                      onClick={() =>
                        goBack(() =>
                          setSelectedInspectorHistoryRecord(null),
                        )
                      }
                      type="button"
                    >
                      ×
                    </button>
                    <div>
                      <span className="record-status driver">
                        Inspection report
                      </span>
                      <h3>
                        {inspectionPropertyAddress(
                          selectedInspectorHistoryRecord,
                        )}{" "}
                        | Room{" "}
                        {inspectionRoomNumber(
                          selectedInspectorHistoryRecord,
                        )}
                      </h3>
                      <small>
                        Captured by{" "}
                        {selectedInspectorHistoryRecord.inspectionReport
                          .inspectorName ?? "Inspector"}{" "}
                        on{" "}
                        {formatDisplayDate(
                          selectedInspectorHistoryRecord.inspectionReport.completedAt,
                        )}
                      </small>
                    </div>
                    {selectedInspectorHistoryRecord.inspectionReport.problems.map(
                      (problem, index) => (
                        <article className="record-card" key={problem.id}>
                          <div>
                            <span className="record-status driver">
                              Problem {index + 1}
                            </span>
                            <p>{problem.description}</p>
                          </div>
                          <ul>
                            <li>Photos attached: {problem.photoCount}</li>
                            <li>Videos attached: {problem.videoCount}</li>
                          </ul>
                        </article>
                      ),
                    )}
                  </section>
                )}
              {inspectorHistory.filter((record) =>
                matchesBoardSearch(
                  "inspector-history",
                  record.name,
                  inspectionPropertyAddress(record),
                  inspectionRoomNumber(record),
                ),
              ).length === 0 ? (
                <p className="empty-records">No completed inspections yet.</p>
              ) : (
                inspectorHistory
                  .filter((record) =>
                    matchesBoardSearch(
                      "inspector-history",
                      record.name,
                      inspectionPropertyAddress(record),
                      inspectionRoomNumber(record),
                    ),
                  )
                  .map((record) => (
                    <button
                      className="history-row"
                      key={`inspector-history-${record.id}`}
                      onClick={() =>
                        goForward(() =>
                          setSelectedInspectorHistoryRecord(record),
                        )
                      }
                      type="button"
                    >
                      <span className="record-status driver">
                        {isLeaverRecord(record) ? "Leaver" : "Transfer"}
                      </span>
                      <strong>{inspectionPropertyAddress(record)}</strong>
                      <small>Room {inspectionRoomNumber(record)}</small>
                    </button>
                  ))
              )}
            </div>
          </section>
        ) : !isReceptionist ? (
          <section className="empty-state-card">
            <button
              className="back-button"
              onClick={() => setSelectedModule(null)}
              type="button"
            >
              Back to modules
            </button>
            <h2>{selectedModule}</h2>
            <p>This module is ready to be built next.</p>
          </section>
        ) : !selectedReceptionAction ? (
          <>
            <div className="reception-actions">
              <button
                className="back-button"
                onClick={() => {
                  setSelectedModule(null);
                  setSelectedReceptionAction(null);
                  resetReferralForm();
                }}
                type="button"
              >
                Back to modules
              </button>
            </div>
            <div className="module-grid">
              {receptionistOptions.map((option, index) => (
                <OptionCard
                  index={index}
                  key={option}
                  label={option}
                  onClick={() => {
                    setSelectedReceptionAction(option);
                    resetReferralForm();
                  }}
                />
              ))}
            </div>
          </>
        ) : selectedReceptionAction === "Follow ups" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => setSelectedReceptionAction(null)}
              type="button"
            >
              Back to reception options
            </button>
            <div className="records-heading">
              <h2>Follow ups</h2>
              <p>
                Referrals missing NI Number or proof of income. Reminders are
                scheduled every 2 days, 2 times.
              </p>
            </div>
            <div className="records-list">
              {followUps.length === 0 ? (
                <p className="empty-records">No follow ups yet.</p>
              ) : (
                followUps.map((record) => (
                  <article className="record-card" key={record.id}>
                    <div>
                      <span className="record-status follow-up">Follow up</span>
                      <h3>{record.fullName}</h3>
                      <p>{record.reasons.join(" ")}</p>
                    </div>
                    <div className="reminder-list">
                      {getReminderDates(record.createdAt).map((date, index) => (
                        <span key={date.toISOString()}>
                          Reminder {index + 1}: {formatDisplayDate(date)}
                        </span>
                      ))}
                    </div>
                    <button
                      className="submit-button compact-button"
                      onClick={() => openFollowUpForEdit(record)}
                      type="button"
                    >
                      Edit form
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : selectedReceptionAction === "History" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => setSelectedReceptionAction(null)}
              type="button"
            >
              Back to reception options
            </button>
            <div className="records-heading">
              <h2>History</h2>
              <p>Passed and failed referrals are stored here.</p>
            </div>
            <div className="records-list">
              {selectedHistoryDetail && (
                <section className="history-detail">
                  <button
                    aria-label="Close details"
                    className="detail-close"
                    onClick={() => goBack(() => setSelectedHistoryDetail(null))}
                    type="button"
                  >
                    ×
                  </button>
                  <div>
                    <span className="record-status driver">Details</span>
                    <h3>
                      {"name" in selectedHistoryDetail
                        ? selectedHistoryDetail.name
                        : selectedHistoryDetail.fullName}
                    </h3>
                  </div>
                  <textarea
                    readOnly
                    rows={12}
                    value={formatFullHistoryDetails(selectedHistoryDetail)}
                  />
                </section>
              )}
              {history.length === 0 ? (
                <p className="empty-records">No history yet.</p>
              ) : (
                history.map((record) => (
                  <button
                    className="history-row"
                    key={record.id}
                    onClick={() => goForward(() => setSelectedHistoryDetail(record))}
                    type="button"
                  >
                    <span className={`record-status ${record.status}`}>
                      {getHistoryStatusLabel(record)}
                    </span>
                    <strong>{record.fullName}</strong>
                    <small>
                      {record.phoneNumber || "No phone"} | Age:{" "}
                      {record.age || "Not set"}
                    </small>
                  </button>
                ))
              )}
            </div>
          </section>
        ) : !isNewReferral ? (
          <section className="empty-state-card">
            <button
              className="back-button"
              onClick={() => setSelectedReceptionAction(null)}
              type="button"
            >
              Back to reception options
            </button>
            <h2>{selectedReceptionAction}</h2>
            <p>This area is ready to be built next.</p>
          </section>
        ) : (
          <form className="intake-form" onSubmit={handleReferralSubmit}>
            <div className="form-toolbar">
              <button
                aria-label="Back to reception options"
                className="icon-back-button"
                onClick={() => {
                  setSelectedReceptionAction(null);
                  resetReferralForm();
                }}
                type="button"
              >
                ←
              </button>
              <div className="form-toolbar-title">
                <strong>{editingFollowUpId ? "Edit follow up" : "New referral"}</strong>
                <small>
                  {referralStep === 1
                    ? "Referral details"
                    : referralStep === 2
                      ? "Tenant details"
                      : "Documents and income"}
                </small>
              </div>
              <p>* Mandatory</p>
            </div>

            {referralStep === 1 && (
              <section className="form-section">
                <div className="section-heading">
                  <span>01</span>
                  <div>
                    <h2>Referral details</h2>
                    <p>Start by recording where the referral came from.</p>
                  </div>
                </div>

                <div className="radio-row">
                  <label className="choice-card">
                    <input
                      checked={referralType === "walk-in"}
                      name="referralType"
                      onChange={() => setReferralType("walk-in")}
                      type="radio"
                      value="walk-in"
                    />
                    Walk in
                  </label>
                  <label className="choice-card">
                    <input
                      checked={referralType === "sourced"}
                      name="referralType"
                      onChange={() => setReferralType("sourced")}
                      type="radio"
                      value="sourced"
                    />
                    Sourced
                  </label>
                </div>

                {referralType === "sourced" && (
                  <div className="form-grid">
                    <label className="field field-wide">
                      <span>Referral Officer *</span>
                      <select
                        onChange={(event) =>
                          setReferralOfficer(event.target.value)
                        }
                        required
                        value={referralOfficer}
                      >
                        <option value="" disabled>
                          Choose referral officer
                        </option>
                        {referralOfficers.map((officer) => (
                          <option key={officer} value={officer}>
                            {officer}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </section>
            )}

            {referralStep === 2 && (
              <section className="form-section">
                <div className="section-heading">
                  <span>02</span>
                  <div>
                    <h2>Tenant details</h2>
                    <p>Capture the tenant identity and contact information.</p>
                  </div>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Full Name *</span>
                    <input
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Enter full name"
                      required
                      type="text"
                      value={fullName}
                    />
                  </label>

                  <label className="field">
                    <span>Phone Number *</span>
                    <input
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder="Enter phone number"
                      required
                      type="tel"
                      value={phoneNumber}
                    />
                  </label>

                  <label className="field">
                    <span>Email</span>
                    <input placeholder="Enter email address" type="email" />
                  </label>

                  <label className="field">
                    <span>Date of Birth *</span>
                    <input
                      onChange={(event) => setDateOfBirth(event.target.value)}
                      required
                      type="date"
                      value={dateOfBirth}
                    />
                  </label>

                  <div className="field readonly-field">
                    <span>Age</span>
                    <strong>
                      {age ? `${age} years old` : "Select date of birth"}
                    </strong>
                  </div>

                  <label className="field">
                    <span>Gender *</span>
                    <select required defaultValue="">
                      <option value="" disabled>
                        Choose gender
                      </option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="mix">Mix</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Tenant Type</span>
                    <select
                      onChange={(event) => {
                        setTenantType(event.target.value);
                        if (event.target.value !== "family") {
                          setFamilyMembersBelow10("");
                        }
                      }}
                      value={tenantType}
                    >
                      <option value="">Choose tenant type</option>
                      <option value="single">Single</option>
                      <option value="family">Family</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Phone Number of Next of Kin</span>
                    <input placeholder="Enter next of kin phone" type="tel" />
                  </label>

                  {tenantType === "family" && (
                    <label className="field">
                      <span>Number of children &lt;10</span>
                      <select
                        onChange={(event) =>
                          setFamilyMembersBelow10(event.target.value)
                        }
                        value={familyMembersBelow10}
                      >
                        <option value="" disabled>
                          Choose number
                        </option>
                        {Array.from({ length: 10 }, (_, index) => index).map(
                          (count) => (
                            <option key={count} value={count}>
                              {count}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                </div>
              </section>
            )}

            {referralStep === 3 && (
              <section className="form-section">
                <div className="section-heading">
                  <span>03</span>
                  <div>
                    <h2>Documents and income</h2>
                    <p>Add NI number, ID, and proof of income details.</p>
                  </div>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>NI Number</span>
                    <input
                      onChange={(event) => setNiNumber(event.target.value)}
                      placeholder="Enter NI number"
                      type="text"
                      value={niNumber}
                    />
                  </label>

                  <label className="field file-field">
                    <span>ID photo *</span>
                    <input
                      accept="image/*"
                      capture="environment"
                      required
                      type="file"
                    />
                    <small>Use the camera to take a photo of the ID.</small>
                  </label>

                  <div className="field field-wide">
                    <span>Proof of Income</span>
                    <div className="radio-row compact">
                      <label className="choice-card">
                        <input
                          checked={proofMethod === "upload"}
                          name="proofMethod"
                          onChange={() => setProofMethod("upload")}
                          type="radio"
                          value="upload"
                        />
                        Upload picture
                      </label>
                      <label className="choice-card">
                        <input
                          checked={proofMethod === "camera"}
                          name="proofMethod"
                          onChange={() => setProofMethod("camera")}
                          type="radio"
                          value="camera"
                        />
                        Take picture
                      </label>
                    </div>
                  </div>

                  <label className="field file-field">
                    <span>
                      {proofMethod === "camera"
                        ? "Take proof of income photo"
                        : "Upload proof of income picture"}
                    </span>
                    <input
                      accept="image/*"
                      capture={
                        proofMethod === "camera" ? "environment" : undefined
                      }
                      type="file"
                    />
                  </label>

                  <label className="field">
                    <span>Last income amount (£)</span>
                    <div className="money-input">
                      <span>£</span>
                      <input
                        min="0"
                        onChange={(event) => setIncomeAmount(event.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={incomeAmount}
                      />
                    </div>
                  </label>
                </div>
              </section>
            )}

            <div className="wizard-actions">
              {referralStep > 1 && (
                <button
                  className="secondary-button"
                  onClick={() => setReferralStep((currentStep) => currentStep - 1)}
                  type="button"
                >
                  Back
                </button>
              )}
              <button className="submit-button" type="submit">
                {referralStep === totalReferralSteps ? "Save reception intake" : "Next"}
              </button>
            </div>
          </form>
        )}
      </section>
      )}
    </main>
  );
}
