"use client";

import { type FormEvent, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  inspectorOptions,
  leaverNotifyModules,
  transferNotifyModules,
  modules,
  processingHistoryOptions,
  processingModules,
  processingOptions,
  receptionistOptions,
  referralOfficerOptions,
  referralOfficers,
  supportWorkers,
  supportHistoryOptions,
  supportOptions,
  teamMembersByModule,
} from "./data";
import type {
  CleaningFields,
  CleaningRequestSource,
  CleaningStatus,
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
import { LoginScreen } from "./components/LoginScreen";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./components/ThemeProvider";
import { OptionCard } from "./components/OptionCard";
import { RecordMediaGallery } from "./components/RecordMediaGallery";
import { UsersAdmin } from "./components/UsersAdmin";
import { goBack, goForward } from "./transitions";
import { useCountUp } from "./useCountUp";
import { useNowTick } from "./useNowTick";
import { supabase } from "../lib/supabase";
import { getCurrentProfile, type Profile } from "../lib/auth";
import { uploadMany, uploadOne } from "../lib/storage";
import {
  buildReferralZipFolderName,
  downloadReferralDocumentsZip,
  type DownloadMediaItem,
} from "../lib/download-referral-documents";
import { downloadInspectionDocumentsZip } from "../lib/download-inspection-documents";
import { getInitialTheme, LOGIN_THEME } from "../lib/theme";

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
  id_photo_path: string | null;
  proof_of_income_path: string | null;
  signature_photo_path: string | null;
  sd_document_paths: string[] | null;
  handoff_notes: string | null;
  timeline_end: string | null;
  monday_status: string | null;
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
  maintenanceRequested?: boolean;
  maintenanceDescription?: string;
  maintenancePhotoPaths?: string[];
  maintenanceVideoPaths?: string[];
  cleaningRequested?: boolean;
  cleaningDescription?: string;
  cleaningPhotoPaths?: string[];
  cleaningVideoPaths?: string[];
};

type SupabaseCleaningColumns = {
  cleaning_status: string | null;
  cleaning_request_source: string | null;
  cleaning_requested_at: string | null;
  cleaning_assigned_at: string | null;
  cleaning_completed_at: string | null;
  cleaning_description: string | null;
  cleaning_photo_paths: string[] | null;
  cleaning_video_paths: string[] | null;
  cleaning_completion_photo_paths: string[] | null;
  cleaning_completion_video_paths: string[] | null;
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
  maintenance_photo_paths: string[] | null;
  maintenance_video_paths: string[] | null;
  inspection_photo_paths: string[] | null;
  inspection_video_paths: string[] | null;
  property_inspected: boolean | null;
  inspection_completed_at: string | null;
  monday_status: string | null;
  created_at: string;
} & Partial<SupabaseCleaningColumns>;

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
  maintenance_photo_paths: string[] | null;
  maintenance_video_paths: string[] | null;
  inspection_photo_paths: string[] | null;
  inspection_video_paths: string[] | null;
  property_inspected: boolean | null;
  inspection_completed_at: string | null;
  monday_status: string | null;
  created_at: string;
} & Partial<SupabaseCleaningColumns>;

function KpiNumber({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{animated}</>;
}

type SdStage = "back-filling" | "viewing";
type SdSlot = { code: string; name: string; stage: SdStage };
const SD_SLOTS: readonly SdSlot[] = [
  { code: "SD-1", name: "License agreement / dates & signatures", stage: "back-filling" },
  { code: "SD-2", name: "Referral, risk assessment & GDPR form", stage: "back-filling" },
  { code: "SD-3", name: "Missing person form", stage: "back-filling" },
  { code: "SD-4", name: "Confidentiality form", stage: "back-filling" },
  { code: "SD-5", name: "Authorisation form", stage: "back-filling" },
  { code: "SD-6", name: "Fire evacuation", stage: "viewing" },
  { code: "SD-7", name: "Fire safety induction form", stage: "viewing" },
  { code: "SD-8", name: "Service charge form", stage: "back-filling" },
  { code: "SD-9", name: "Resident rights form", stage: "back-filling" },
  { code: "SD-10", name: "ID consent form", stage: "back-filling" },
  { code: "SD-11", name: "Housing benefit application", stage: "back-filling" },
  { code: "SD-12", name: "Proof of benefit with updated address", stage: "back-filling" },
];
const SD_SLOT_COUNT = SD_SLOTS.length;
const BACK_FILLING_SLOT_INDICES: number[] = SD_SLOTS
  .map((slot, index) => (slot.stage === "back-filling" ? index : -1))
  .filter((index) => index !== -1);
const VIEWING_SLOT_INDICES: number[] = SD_SLOTS
  .map((slot, index) => (slot.stage === "viewing" ? index : -1))
  .filter((index) => index !== -1);
const SD_ACCEPT = "application/pdf,image/png,image/jpeg";

function renderSdSlotLabel(slot: { code: string; name: string }) {
  return (
    <span className="sd-slot-label">
      <span className="sd-slot-code">
        {slot.code}
        <em aria-hidden="true">*</em>
      </span>
      <small className="sd-slot-name">{slot.name}</small>
    </span>
  );
}

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [managerView, setManagerView] = useState<
    "dashboard" | "users" | "team"
  >("dashboard");
  const [managerTeam, setManagerTeam] = useState<string | null>(null);
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
  const [maintenanceCompletionFiles, setMaintenanceCompletionFiles] = useState<
    Record<string, { photos: File[]; videos: File[] }>
  >({});
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [proofOfIncomeFile, setProofOfIncomeFile] = useState<File | null>(null);
  const [sdDocumentFiles, setSdDocumentFiles] = useState<
    Record<number, (File | null)[]>
  >({});
  const [sdUploading, setSdUploading] = useState<Record<number, boolean>>({});
  const [viewingSdFiles, setViewingSdFiles] = useState<
    Record<number, (File | null)[]>
  >({});
  const [inspectionItemFiles, setInspectionItemFilesByKey] = useState<
    Record<string, { photos: File[]; videos: File[] }>
  >({});
  const [intakeUploading, setIntakeUploading] = useState(false);
  const [maintenanceUploading, setMaintenanceUploading] = useState<
    Record<string, boolean>
  >({});
  const [inspectionUploading, setInspectionUploading] = useState(false);
  const [
    inspectionMaintenanceRequested,
    setInspectionMaintenanceRequested,
  ] = useState<boolean | null>(null);
  const [inspectionCleaningRequested, setInspectionCleaningRequested] =
    useState<boolean | null>(null);
  const [inspectionMaintenanceDraft, setInspectionMaintenanceDraft] = useState<
    InspectionProblem[]
  >([]);
  const [inspectionCleaningDraft, setInspectionCleaningDraft] = useState<
    InspectionProblem[]
  >([]);
  const [cleanersPendingLeavers, setCleanersPendingLeavers] = useState<
    LeaverRecord[]
  >([]);
  const [cleanersPendingTransfers, setCleanersPendingTransfers] = useState<
    TransferRecord[]
  >([]);
  const [cleanersHistoryLeavers, setCleanersHistoryLeavers] = useState<
    LeaverRecord[]
  >([]);
  const [cleanersHistoryTransfers, setCleanersHistoryTransfers] = useState<
    TransferRecord[]
  >([]);
  const [cleaningCompletionFiles, setCleaningCompletionFiles] = useState<
    Record<string, { photos: File[]; videos: File[] }>
  >({});
  const [cleaningCompletionEvidence, setCleaningCompletionEvidence] = useState<
    Record<string, { hasPhotos: boolean; hasVideos: boolean }>
  >({});
  const [cleaningUploading, setCleaningUploading] = useState<
    Record<string, boolean>
  >({});
  const [maintenanceNeedsCleaning, setMaintenanceNeedsCleaning] = useState<
    Record<string, boolean | null>
  >({});
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
  const [passedReferralOfficer, setPassedReferralOfficer] = useState("");
  const [passedReferralId, setPassedReferralId] = useState<number | null>(null);
  const [selectedIncomingReferralId, setSelectedIncomingReferralId] =
    useState<number | null>(null);
  const [documentsDownloading, setDocumentsDownloading] = useState(false);

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

    async function refreshProfile() {
      const profile = await getCurrentProfile();
      if (!isMounted) {
        return;
      }
      setCurrentProfile(profile);
      if (profile && profile.role !== "Manager") {
        setSelectedModule(profile.role);
      }
      setAuthReady(true);
    }

    void refreshProfile();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setCurrentProfile(null);
        setSelectedModule(null);
        setManagerView("dashboard");
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void refreshProfile();
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useLayoutEffect(() => {
    if (!authReady || !currentProfile) {
      setTheme(LOGIN_THEME, false);
      return;
    }
    setTheme(getInitialTheme());
  }, [authReady, currentProfile, setTheme]);

  useEffect(() => {
    if (!currentProfile) {
      return;
    }
    if (currentProfile.role === "Manager") {
      return;
    }
    if (selectedModule !== currentProfile.role) {
      setSelectedModule(currentProfile.role);
    }
  }, [currentProfile, selectedModule]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setCurrentProfile(null);
    setSelectedModule(null);
    setManagerView("dashboard");
  }

  useEffect(() => {
    if (!currentProfile) {
      return;
    }

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
  }, [currentProfile]);

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
    setPassedReferralOfficer("");
    setPassedReferralId(null);
    setIdPhotoFile(null);
    setProofOfIncomeFile(null);
  }

  function resetLeaverForm() {
    setLeaverName("");
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

    if (option === "Cleaners" && selectedModule === "Tenants Management") {
      return {
        alert: false,
        count:
          cleanersPendingLeavers.length + cleanersPendingTransfers.length,
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
      idPhotoPath: record.id_photo_path ?? undefined,
      proofOfIncomePath: record.proof_of_income_path ?? undefined,
      signaturePhotoPath: record.signature_photo_path ?? undefined,
      sdDocumentPaths: record.sd_document_paths ?? undefined,
      handoffNotes: record.handoff_notes ?? undefined,
      timelineEnd: record.timeline_end ?? undefined,
      mondayStatus: record.monday_status ?? undefined,
      referralOfficerStatus: record.referral_officer_status,
      hbClaimsStatus: record.hb_claims_status,
      rmsStatus: record.rms_status,
      tenantsManagementStatus: record.tenants_management_status,
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
      maintenanceRequested: stored.maintenanceRequested,
      maintenanceDescription: stored.maintenanceDescription,
      maintenancePhotoPaths: stored.maintenancePhotoPaths,
      maintenanceVideoPaths: stored.maintenanceVideoPaths,
      cleaningRequested: stored.cleaningRequested,
      cleaningDescription: stored.cleaningDescription,
      cleaningPhotoPaths: stored.cleaningPhotoPaths,
      cleaningVideoPaths: stored.cleaningVideoPaths,
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

  function isCleaningStatus(value: unknown): value is CleaningStatus {
    return value === "pending" || value === "assigned" || value === "completed";
  }

  function isCleaningSource(value: unknown): value is CleaningRequestSource {
    return value === "inspector" || value === "maintenance";
  }

  function readCleaningFields(
    record: Partial<SupabaseCleaningColumns>,
  ): CleaningFields {
    return {
      cleaningStatus: isCleaningStatus(record.cleaning_status)
        ? record.cleaning_status
        : undefined,
      cleaningRequestSource: isCleaningSource(record.cleaning_request_source)
        ? record.cleaning_request_source
        : undefined,
      cleaningRequestedAt: record.cleaning_requested_at
        ? new Date(record.cleaning_requested_at)
        : undefined,
      cleaningAssignedAt: record.cleaning_assigned_at
        ? new Date(record.cleaning_assigned_at)
        : undefined,
      cleaningCompletedAt: record.cleaning_completed_at
        ? new Date(record.cleaning_completed_at)
        : undefined,
      cleaningDescription: record.cleaning_description ?? undefined,
      cleaningPhotoPaths: record.cleaning_photo_paths ?? undefined,
      cleaningVideoPaths: record.cleaning_video_paths ?? undefined,
      cleaningCompletionPhotoPaths:
        record.cleaning_completion_photo_paths ?? undefined,
      cleaningCompletionVideoPaths:
        record.cleaning_completion_video_paths ?? undefined,
    };
  }

  function writeCleaningFields(
    fields: CleaningFields,
  ): Partial<SupabaseCleaningColumns> {
    return {
      cleaning_status: fields.cleaningStatus ?? null,
      cleaning_request_source: fields.cleaningRequestSource ?? null,
      cleaning_requested_at: fields.cleaningRequestedAt?.toISOString() ?? null,
      cleaning_assigned_at: fields.cleaningAssignedAt?.toISOString() ?? null,
      cleaning_completed_at: fields.cleaningCompletedAt?.toISOString() ?? null,
      cleaning_description: fields.cleaningDescription ?? null,
      cleaning_photo_paths: fields.cleaningPhotoPaths ?? [],
      cleaning_video_paths: fields.cleaningVideoPaths ?? [],
      cleaning_completion_photo_paths:
        fields.cleaningCompletionPhotoPaths ?? [],
      cleaning_completion_video_paths:
        fields.cleaningCompletionVideoPaths ?? [],
    };
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
      maintenanceRequested: report.maintenanceRequested,
      maintenanceDescription: report.maintenanceDescription,
      maintenancePhotoPaths: report.maintenancePhotoPaths,
      maintenanceVideoPaths: report.maintenanceVideoPaths,
      cleaningRequested: report.cleaningRequested,
      cleaningDescription: report.cleaningDescription,
      cleaningPhotoPaths: report.cleaningPhotoPaths,
      cleaningVideoPaths: report.cleaningVideoPaths,
    };
  }

  function mapLeaverRow(record: SupabaseLeaverRow): LeaverRecord {
    const report = mapInspectionReport(record.inspection_report ?? null);
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
      maintenancePhotoPaths: record.maintenance_photo_paths ?? undefined,
      maintenanceVideoPaths: record.maintenance_video_paths ?? undefined,
      inspectionPhotoPaths: record.inspection_photo_paths ?? undefined,
      inspectionVideoPaths: record.inspection_video_paths ?? undefined,
      assignedJobDate: record.assigned_job_date ?? undefined,
      cleaningScheduledDate: record.cleaning_scheduled_date ?? undefined,
      maintenanceScheduledDate: record.maintenance_scheduled_date ?? undefined,
      assignedTo: record.assigned_to ?? undefined,
      assignedBy: record.assigned_by ?? undefined,
      assignedAt: record.assigned_at ? new Date(record.assigned_at) : undefined,
      escalationCount: record.escalation_count ?? 0,
      tenantsManagementStatus: record.tenants_management_status,
      hbClaimsStatus: record.hb_claims_status,
      rmsStatus: record.rms_status,
      maintenanceStatus: record.maintenance_status,
      propertyInspected:
        Boolean(record.property_inspected) || Boolean(report?.completedAt),
      maintenanceRequired: report?.maintenanceRequested === true,
      inspectionCompletedAt: record.inspection_completed_at ?? undefined,
      mondayStatus: record.monday_status ?? undefined,
      inspectionReport: report,
      createdAt: new Date(record.created_at),
      ...readCleaningFields(record),
    };
  }

  function mapTransferRow(record: SupabaseTransferRow): TransferRecord {
    const report = mapInspectionReport(record.inspection_report ?? null);
    return {
      id: record.app_record_id,
      mondayItemId: record.monday_item_id ?? undefined,
      name: record.full_name,
      niNumber: record.ni_number ?? "",
      mondayStatus: record.monday_status ?? undefined,
      tenantsManagementStatus: record.tenants_management_status,
      hbClaimsStatus: record.hb_claims_status,
      rmsStatus: record.rms_status,
      maintenanceStatus: record.maintenance_status,
      propertyInspected:
        Boolean(record.property_inspected) || Boolean(report?.completedAt),
      maintenanceRequired: report?.maintenanceRequested === true,
      inspectionCompletedAt: record.inspection_completed_at ?? undefined,
      currentProperty: record.current_property_address,
      currentRoomNumber: record.current_room_number,
      transferDate: record.transfer_date,
      newPropertyAddress: record.new_property_address,
      newRoomNumber: record.new_room_number,
      cleaningType: record.cleaning_type ?? "",
      oldRoomMaintenanceWork: record.old_room_maintenance_work ?? "",
      hasMaintenancePhotos: record.has_maintenance_photos,
      hasMaintenanceVideos: record.has_maintenance_videos,
      maintenancePhotoPaths: record.maintenance_photo_paths ?? undefined,
      maintenanceVideoPaths: record.maintenance_video_paths ?? undefined,
      inspectionPhotoPaths: record.inspection_photo_paths ?? undefined,
      inspectionVideoPaths: record.inspection_video_paths ?? undefined,
      assignedJobDate: record.assigned_job_date ?? undefined,
      cleaningScheduledDate: record.cleaning_scheduled_date ?? undefined,
      assignedTo: record.assigned_to ?? undefined,
      assignedBy: record.assigned_by ?? undefined,
      assignedAt: record.assigned_at ? new Date(record.assigned_at) : undefined,
      escalationCount: record.escalation_count ?? 0,
      inspectionReport: report,
      createdAt: new Date(record.created_at),
      ...readCleaningFields(record),
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
        const referralOfficerStatus = getSavedDepartmentStatus(
          row,
          "Referral Officer",
        );
        const referralOfficerTeamRecord = {
          ...record,
          department: "Referral Officer",
        };

        if (referralOfficerStatus) {
          addRecordToMap(loadedTeamHistory, "Referral Officer", {
            ...referralOfficerTeamRecord,
            teamOutcome: getTeamOutcomeFromSavedStatus(referralOfficerStatus),
          });

          const hbDone = Boolean(row.hb_claims_status);
          const rmsDone = Boolean(row.rms_status);
          const tmDone = Boolean(row.tenants_management_status);

          (["HB Claims Team", "Tenants Management"] as const).forEach((department) => {
            const teamRecord = { ...record, department };
            const savedStatus = getSavedDepartmentStatus(row, department);

            if (savedStatus) {
              addRecordToMap(loadedTeamHistory, department, {
                ...teamRecord,
                teamOutcome: getTeamOutcomeFromSavedStatus(savedStatus),
              });
            } else if (referralOfficerStatus) {
              addRecordToMap(loadedTeamQueues, department, teamRecord);
            }
          });

          if (hbDone) {
            const department = "RMS Team";
            const teamRecord = { ...record, department };
            const savedStatus = getSavedDepartmentStatus(row, department);
            if (savedStatus) {
              addRecordToMap(loadedTeamHistory, department, {
                ...teamRecord,
                teamOutcome: getTeamOutcomeFromSavedStatus(savedStatus),
              });
            } else if (!rmsDone) {
              addRecordToMap(loadedTeamQueues, department, teamRecord);
            }
          }
        } else {
          addRecordToMap(
            loadedTeamQueues,
            "Referral Officer",
            referralOfficerTeamRecord,
          );
        }
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
    const loadedCleanersPending: LeaverRecord[] = [];
    const loadedCleanersHistory: LeaverRecord[] = [];

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

      if (record.cleaningStatus === "pending" || record.cleaningStatus === "assigned") {
        loadedCleanersPending.push(record);
      } else if (record.cleaningStatus === "completed") {
        loadedCleanersHistory.push(record);
      }

      const hbStatus = getSavedDepartmentStatus(row, "HB Claims Team");
      const tmStatus = getSavedDepartmentStatus(row, "Tenants Management");

      if (!tmStatus) {
        addRecordToMap(loadedTeamQueues, "Tenants Management", {
          ...record,
          department: "Tenants Management",
        });
      } else {
        addRecordToMap(loadedTeamHistory, "Tenants Management", {
          ...record,
          department: "Tenants Management",
        });
      }

      if (!hbStatus) {
        addRecordToMap(loadedTeamQueues, "HB Claims Team", {
          ...record,
          department: "HB Claims Team",
        });
      } else {
        addRecordToMap(loadedTeamHistory, "HB Claims Team", {
          ...record,
          department: "HB Claims Team",
        });

        const rmsStatus = getSavedDepartmentStatus(row, "RMS Team");
        const rmsRecord = { ...record, department: "RMS Team" as const };
        if (rmsStatus) {
          addRecordToMap(loadedTeamHistory, "RMS Team", rmsRecord);
        } else {
          addRecordToMap(loadedTeamQueues, "RMS Team", rmsRecord);
        }
      }
    });

    setSupportLeaverHistory(loadedSupportHistory);
    setTeamLeavers(loadedTeamQueues);
    setTeamLeaverHistory(loadedTeamHistory);
    setMaintenancePendingLeavers(loadedMaintenancePending);
    setInspectorLeavers(loadedInspectorQueue);
    setInspectorHistory((current) => [...loadedInspectorHistory, ...current]);
    setCleanersPendingLeavers(loadedCleanersPending);
    setCleanersHistoryLeavers(loadedCleanersHistory);
  }

  function hydrateTransferRecords(records: SupabaseTransferRow[]) {
    const loadedSupportHistory = records.map(mapTransferRow);
    const loadedTeamQueues: Record<string, TransferRecord[]> = {};
    const loadedTeamHistory: Record<string, TransferRecord[]> = {};
    const loadedMaintenancePending: TransferRecord[] = [];
    const loadedInspectorQueue: TransferRecord[] = [];
    const loadedInspectorHistory: TransferRecord[] = [];
    const loadedCleanersPending: TransferRecord[] = [];
    const loadedCleanersHistory: TransferRecord[] = [];

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

      if (record.cleaningStatus === "pending" || record.cleaningStatus === "assigned") {
        loadedCleanersPending.push(record);
      } else if (record.cleaningStatus === "completed") {
        loadedCleanersHistory.push(record);
      }

      const hbStatus = getSavedDepartmentStatus(row, "HB Claims Team");
      const tmStatus = getSavedDepartmentStatus(row, "Tenants Management");

      if (!tmStatus) {
        addRecordToMap(loadedTeamQueues, "Tenants Management", {
          ...record,
          department: "Tenants Management",
        });
      } else {
        addRecordToMap(loadedTeamHistory, "Tenants Management", {
          ...record,
          department: "Tenants Management",
        });
      }

      if (!hbStatus) {
        addRecordToMap(loadedTeamQueues, "HB Claims Team", {
          ...record,
          department: "HB Claims Team",
        });
      } else {
        addRecordToMap(loadedTeamHistory, "HB Claims Team", {
          ...record,
          department: "HB Claims Team",
        });

        const rmsStatus = getSavedDepartmentStatus(row, "RMS Team");
        const rmsRecord = { ...record, department: "RMS Team" as const };
        if (rmsStatus) {
          addRecordToMap(loadedTeamHistory, "RMS Team", rmsRecord);
        } else {
          addRecordToMap(loadedTeamQueues, "RMS Team", rmsRecord);
        }
      }
    });

    setSupportTransferHistory(loadedSupportHistory);
    setTeamTransfers(loadedTeamQueues);
    setTeamTransferHistory(loadedTeamHistory);
    setMaintenancePendingTransfers(loadedMaintenancePending);
    setInspectorTransfers(loadedInspectorQueue);
    setInspectorHistory((current) => [...loadedInspectorHistory, ...current]);
    setCleanersPendingTransfers(loadedCleanersPending);
    setCleanersHistoryTransfers(loadedCleanersHistory);
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
        id_photo_path: record.idPhotoPath ?? null,
        proof_of_income_path: record.proofOfIncomePath ?? null,
        signature_photo_path: record.signaturePhotoPath ?? null,
        sd_document_paths: record.sdDocumentPaths ?? null,
        handoff_notes: record.handoffNotes || null,
        timeline_end: record.timelineEnd || null,
        monday_status: record.mondayStatus || null,
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
        maintenance_photo_paths: record.maintenancePhotoPaths ?? [],
        maintenance_video_paths: record.maintenanceVideoPaths ?? [],
        inspection_photo_paths: record.inspectionPhotoPaths ?? [],
        inspection_video_paths: record.inspectionVideoPaths ?? [],
        assigned_job_date: record.assignedJobDate || null,
        assigned_to: record.assignedTo || null,
        assigned_by: record.assignedBy || null,
        assigned_at: record.assignedAt?.toISOString() ?? null,
        escalation_count: record.escalationCount ?? 0,
        tenants_management_status: record.tenantsManagementStatus ?? null,
        hb_claims_status: record.hbClaimsStatus ?? null,
        rms_status: record.rmsStatus ?? null,
        maintenance_status: record.maintenanceStatus ?? null,
        property_inspected: record.propertyInspected ?? false,
        inspection_completed_at: record.inspectionCompletedAt ?? null,
        monday_status: record.mondayStatus ?? null,
        inspection_report: serialiseInspectionReport(record.inspectionReport),
        monday_item_id: record.mondayItemId || null,
        ...writeCleaningFields(record),
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
        maintenance_photo_paths: record.maintenancePhotoPaths ?? [],
        maintenance_video_paths: record.maintenanceVideoPaths ?? [],
        inspection_photo_paths: record.inspectionPhotoPaths ?? [],
        inspection_video_paths: record.inspectionVideoPaths ?? [],
        assigned_job_date: record.assignedJobDate || null,
        assigned_to: record.assignedTo || null,
        assigned_by: record.assignedBy || null,
        assigned_at: record.assignedAt?.toISOString() ?? null,
        escalation_count: record.escalationCount ?? 0,
        tenants_management_status: record.tenantsManagementStatus ?? null,
        hb_claims_status: record.hbClaimsStatus ?? null,
        rms_status: record.rmsStatus ?? null,
        maintenance_status: record.maintenanceStatus ?? null,
        property_inspected: record.propertyInspected ?? false,
        inspection_completed_at: record.inspectionCompletedAt ?? null,
        monday_status: record.mondayStatus ?? null,
        inspection_report: serialiseInspectionReport(record.inspectionReport),
        monday_item_id: record.mondayItemId || null,
        ...writeCleaningFields(record),
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

  async function fetchReferralLifecycleStatuses(appRecordId: number) {
    const { data, error } = await supabase
      .from("referrals")
      .select(
        "referral_officer_status, hb_claims_status, rms_status, tenants_management_status, timeline_end, monday_item_id",
      )
      .eq("app_record_id", appRecordId)
      .maybeSingle();

    if (error) {
      console.error("Could not load referral lifecycle statuses", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      referralOfficerStatus: data.referral_officer_status,
      hbClaimsStatus: data.hb_claims_status,
      rmsStatus: data.rms_status,
      tenantsManagementStatus: data.tenants_management_status,
      timelineEnd: data.timeline_end,
      mondayItemId: data.monday_item_id ?? undefined,
    };
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
        timelineEnd?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Could not create Monday item.");
      }

      return result.itemId
        ? { itemId: result.itemId, timelineEnd: result.timelineEnd }
        : undefined;
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
    dates?: {
      noticeDate?: string;
      assignedDate?: string;
      inspectionDate?: string;
    },
  ) {
    if (!record.mondayItemId) {
      toast.error("Could not sync with Monday", {
        description:
          "This record has no Monday item id. Finish as secured first so Referral Tracker is created.",
      });
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
          referralOfficerStatus:
            "referralOfficerStatus" in record
              ? record.referralOfficerStatus
              : null,
          hbClaimsStatus:
            "hbClaimsStatus" in record ? record.hbClaimsStatus : null,
          rmsStatus: "rmsStatus" in record ? record.rmsStatus : null,
          tenantsManagementStatus:
            "tenantsManagementStatus" in record
              ? record.tenantsManagementStatus
              : null,
          timelineEnd: "timelineEnd" in record ? record.timelineEnd : null,
          maintenanceStatus:
            "maintenanceStatus" in record ? record.maintenanceStatus : null,
          propertyInspected:
            ("propertyInspected" in record && record.propertyInspected) ||
            Boolean(
              "inspectionReport" in record && record.inspectionReport?.completedAt,
            ),
          maintenanceRequired:
            "maintenanceRequired" in record && record.maintenanceRequired === true,
          inspectionDate: dates?.inspectionDate,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "Could not update Monday item.");
      }
    } catch (error) {
      console.error("Could not update Monday item", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Could not sync update with Monday", {
        description: message.includes("inactive items")
          ? "This Monday item is in an archived group. Move it to an active group on the board, then try again."
          : message,
      });
    }
  }

  async function syncReferralMondayLifecycle(
    record: ReferralRecord & {
      referralOfficerStatus?: string | null;
      hbClaimsStatus?: string | null;
      rmsStatus?: string | null;
      tenantsManagementStatus?: string | null;
    },
  ) {
    if (!record.mondayItemId) {
      return;
    }

    try {
      const response = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync-referral-lifecycle",
          itemId: record.mondayItemId,
          referralOfficerStatus: record.referralOfficerStatus ?? null,
          hbClaimsStatus: record.hbClaimsStatus ?? null,
          rmsStatus: record.rmsStatus ?? null,
          tenantsManagementStatus: record.tenantsManagementStatus ?? null,
          timelineEnd: record.timelineEnd ?? null,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        console.error(
          "Could not sync referral lifecycle with Monday",
          result.error,
        );
        return;
      }

      const result = (await response.json()) as { status?: { label?: string } };
      const label =
        result.status && typeof result.status === "object"
          ? result.status.label
          : undefined;
      if (label) {
        await supabase
          .from("referrals")
          .update({ monday_status: label })
          .eq("app_record_id", record.id);
      }
    } catch (error) {
      console.error("Could not sync referral lifecycle", error);
    }
  }

  async function fetchLeaverLifecycleStatuses(appRecordId: number) {
    const { data, error } = await supabase
      .from("leavers")
      .select(
        "tenants_management_status, hb_claims_status, rms_status, maintenance_status, property_inspected, inspection_report, monday_item_id",
      )
      .eq("app_record_id", appRecordId)
      .maybeSingle();

    if (error || !data) {
      console.error("Could not load leaver lifecycle statuses", error);
      return null;
    }

    const report = data.inspection_report as StoredInspectionReport | null;

    return {
      tenantsManagementStatus: data.tenants_management_status,
      hbClaimsStatus: data.hb_claims_status,
      rmsStatus: data.rms_status,
      maintenanceStatus: data.maintenance_status,
      propertyInspected:
        Boolean(data.property_inspected) || Boolean(report?.completedAt),
      maintenanceRequired: report?.maintenanceRequested === true,
      mondayItemId: data.monday_item_id ?? undefined,
    };
  }

  function buildTrackerLifecyclePayload(
    record: LeaverRecord | TransferRecord,
    fromDb: Awaited<ReturnType<typeof fetchLeaverLifecycleStatuses>> | null,
  ) {
    const report = record.inspectionReport;
    return {
      tenantsManagementStatus:
        fromDb?.tenantsManagementStatus ?? record.tenantsManagementStatus ?? null,
      hbClaimsStatus: fromDb?.hbClaimsStatus ?? record.hbClaimsStatus ?? null,
      rmsStatus: fromDb?.rmsStatus ?? record.rmsStatus ?? null,
      maintenanceStatus:
        fromDb?.maintenanceStatus ?? record.maintenanceStatus ?? null,
      propertyInspected:
        fromDb?.propertyInspected ??
        record.propertyInspected ??
        Boolean(report?.completedAt),
      maintenanceRequired:
        fromDb?.maintenanceRequired ?? record.maintenanceRequired === true,
    };
  }

  async function syncLeaverMondayLifecycle(record: LeaverRecord) {
    if (!record.mondayItemId) {
      return;
    }

    const fromDb = await fetchLeaverLifecycleStatuses(record.id);
    const payload = buildTrackerLifecyclePayload(record, fromDb);

    try {
      const response = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync-leaver-lifecycle",
          itemId: record.mondayItemId,
          ...payload,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        console.error("Could not sync leaver lifecycle", result.error);
        toast.error("Could not update Monday status", {
          description: result.error ?? "Lifecycle sync failed.",
        });
        return;
      }

      const result = (await response.json()) as { status?: { label?: string } };
      const label =
        result.status && typeof result.status === "object"
          ? result.status.label
          : undefined;
      if (label) {
        await supabase
          .from("leavers")
          .update({ monday_status: label })
          .eq("app_record_id", record.id);
      }
    } catch (error) {
      console.error("Could not sync leaver lifecycle", error);
    }
  }

  async function fetchTransferLifecycleStatuses(appRecordId: number) {
    const { data, error } = await supabase
      .from("transfers")
      .select(
        "tenants_management_status, hb_claims_status, rms_status, maintenance_status, property_inspected, inspection_report, monday_item_id",
      )
      .eq("app_record_id", appRecordId)
      .maybeSingle();

    if (error || !data) {
      console.error("Could not load transfer lifecycle statuses", error);
      return null;
    }

    const report = data.inspection_report as StoredInspectionReport | null;

    return {
      tenantsManagementStatus: data.tenants_management_status,
      hbClaimsStatus: data.hb_claims_status,
      rmsStatus: data.rms_status,
      maintenanceStatus: data.maintenance_status,
      propertyInspected:
        Boolean(data.property_inspected) || Boolean(report?.completedAt),
      maintenanceRequired: report?.maintenanceRequested === true,
      mondayItemId: data.monday_item_id ?? undefined,
    };
  }

  async function syncTransferMondayLifecycle(record: TransferRecord) {
    if (!record.mondayItemId) {
      return;
    }

    const fromDb = await fetchTransferLifecycleStatuses(record.id);
    const payload = buildTrackerLifecyclePayload(record, fromDb);

    try {
      const response = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync-transfer-lifecycle",
          itemId: record.mondayItemId,
          ...payload,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        console.error("Could not sync transfer lifecycle", result.error);
        toast.error("Could not update Monday status", {
          description: result.error ?? "Lifecycle sync failed.",
        });
        return;
      }

      const result = (await response.json()) as { status?: { label?: string } };
      const label =
        result.status && typeof result.status === "object"
          ? result.status.label
          : undefined;
      if (label) {
        await supabase
          .from("transfers")
          .update({ monday_status: label })
          .eq("app_record_id", record.id);
      }
    } catch (error) {
      console.error("Could not sync transfer lifecycle", error);
    }
  }

  async function moveDriverReferralToHistory(
    record: ReferralRecord,
    status: "secured" | "viewing-ended",
  ) {
    let completedRecord: ReferralRecord = {
      ...record,
      status,
      reasons:
        status === "secured"
          ? ["Property secured by driver."]
          : ["Viewing ended or tenant refused remaining properties."],
    };

    if (status === "secured") {
      const viewingFiles = viewingSdFiles[record.id] ?? [];
      const missingViewing = VIEWING_SLOT_INDICES.filter(
        (_, viewingIndex) => !viewingFiles[viewingIndex],
      );
      if (missingViewing.length > 0) {
        toast.error("Missing viewing documents", {
          description: `Please upload ${missingViewing
            .map((slotIndex) => SD_SLOTS[slotIndex].code)
            .join(" and ")} before finishing.`,
        });
        return;
      }

      try {
        const baseSdPaths: string[] = [];
        const existing = completedRecord.sdDocumentPaths ?? [];
        for (let i = 0; i < SD_SLOT_COUNT; i++) {
          baseSdPaths.push(existing[i] ?? "");
        }
        for (
          let viewingIndex = 0;
          viewingIndex < VIEWING_SLOT_INDICES.length;
          viewingIndex++
        ) {
          const slotIndex = VIEWING_SLOT_INDICES[viewingIndex];
          const file = viewingFiles[viewingIndex];
          if (file) {
            const path = await uploadOne(
              "sd-documents",
              ["referral", record.id, SD_SLOTS[slotIndex].code],
              file,
            );
            baseSdPaths[slotIndex] = path;
          }
        }
        completedRecord = {
          ...completedRecord,
          sdDocumentPaths: baseSdPaths,
        };
        setViewingSdFiles((current) => {
          const next = { ...current };
          delete next[record.id];
          return next;
        });
      } catch (error) {
        console.error("Could not upload viewing SD documents", error);
        toast.error("Could not upload viewing documents", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
        return;
      }

      const mondayResult = await createMondayItem(
        "create-referral",
        completedRecord,
      );

      completedRecord = {
        ...completedRecord,
        mondayItemId: typeof mondayResult === "string" ? mondayResult : mondayResult?.itemId,
        timelineEnd:
          typeof mondayResult === "object" && mondayResult?.timelineEnd
            ? mondayResult.timelineEnd
            : completedRecord.timelineEnd,
      };

    }

    setDriverQueue((records) =>
      records.filter((driverRecord) => driverRecord.id !== record.id),
    );
    setHistory((records) => [completedRecord, ...records]);
    void saveReferralRecord(completedRecord);

    if (status === "secured") {
      setTeamNewReferrals((queues) => ({
        ...queues,
        "Referral Officer": [
          {
            ...completedRecord,
            department: "Referral Officer",
          },
          ...(queues["Referral Officer"] ?? []),
        ],
      }));
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

  function setMaintenanceFiles(
    type: "leaver" | "transfer",
    id: number,
    kind: "photos" | "videos",
    files: File[],
  ) {
    const key = getMaintenanceEvidenceKey(type, id);
    setMaintenanceCompletionFiles((current) => ({
      ...current,
      [key]: {
        photos: current[key]?.photos ?? [],
        videos: current[key]?.videos ?? [],
        [kind]: files,
      },
    }));
    updateMaintenanceEvidence(type, id, {
      [kind === "photos" ? "hasPhotos" : "hasVideos"]: files.length > 0,
    });
  }

  function inspectionItemKey(kind: "maintenance" | "cleaning", id: number) {
    return `${kind}-${id}`;
  }

  function appendInspectionItemFiles(
    fileKey: string,
    kind: "photos" | "videos",
    incoming: File[],
  ) {
    setInspectionItemFilesByKey((current) => {
      const existing = current[fileKey] ?? { photos: [], videos: [] };
      return {
        ...current,
        [fileKey]: {
          ...existing,
          [kind]: [...existing[kind], ...incoming],
        },
      };
    });
  }

  function isInspectionFormReady() {
    if (
      inspectionMaintenanceRequested === null ||
      inspectionCleaningRequested === null
    ) {
      return false;
    }

    if (
      inspectionMaintenanceRequested &&
      !inspectionMaintenanceDraft.some(
        (item) => item.description.trim().length > 0,
      )
    ) {
      return false;
    }

    if (
      inspectionCleaningRequested &&
      !inspectionCleaningDraft.some((item) => item.description.trim().length > 0)
    ) {
      return false;
    }

    return true;
  }

  async function syncCleaningOrMaintenanceOnMonday(
    record: LeaverRecord | TransferRecord,
    maintenanceRequested: boolean,
    cleaningRequested: boolean,
  ) {
    if (!record.mondayItemId) {
      return;
    }

    const cleaningType = maintenanceRequested
      ? "maintenance"
      : cleaningRequested
        ? "cleaning"
        : null;

    if (!cleaningType) {
      return;
    }

    try {
      const board = isLeaverRecord(record) ? "leavers" : "transfers";
      const response = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-cleaning-or-maintenance",
          board,
          itemId: record.mondayItemId,
          cleaningType,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "Could not update Monday item.");
      }
    } catch (error) {
      console.error("Could not update Cleaning or Maintenance on Monday", error);
      toast.error("Could not update Cleaning or Maintenance on Monday", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function clearMaintenanceFiles(type: "leaver" | "transfer", id: number) {
    const key = getMaintenanceEvidenceKey(type, id);
    setMaintenanceCompletionFiles((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function getCleaningKey(type: "leaver" | "transfer", id: number) {
    return `cleaning-${type}-${id}`;
  }

  function updateCleaningEvidence(
    type: "leaver" | "transfer",
    id: number,
    updates: Partial<{ hasPhotos: boolean; hasVideos: boolean }>,
  ) {
    const key = getCleaningKey(type, id);
    setCleaningCompletionEvidence((current) => ({
      ...current,
      [key]: {
        hasPhotos: current[key]?.hasPhotos ?? false,
        hasVideos: current[key]?.hasVideos ?? false,
        ...updates,
      },
    }));
  }

  function setCleaningFiles(
    type: "leaver" | "transfer",
    id: number,
    kind: "photos" | "videos",
    files: File[],
  ) {
    const key = getCleaningKey(type, id);
    setCleaningCompletionFiles((current) => ({
      ...current,
      [key]: {
        photos: current[key]?.photos ?? [],
        videos: current[key]?.videos ?? [],
        [kind]: files,
      },
    }));
    updateCleaningEvidence(type, id, {
      [kind === "photos" ? "hasPhotos" : "hasVideos"]: files.length > 0,
    });
  }

  function clearCleaningFiles(type: "leaver" | "transfer", id: number) {
    const key = getCleaningKey(type, id);
    setCleaningCompletionFiles((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setCleaningCompletionEvidence((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function completeCleaningJob(
    record: LeaverRecord | TransferRecord,
    type: "leaver" | "transfer",
  ) {
    const key = getCleaningKey(type, record.id);
    const evidence = cleaningCompletionEvidence[key];
    if (!evidence?.hasPhotos || !evidence?.hasVideos) {
      toast.error("Attach completion media", {
        description:
          "Add at least one photo and one video showing the cleaning is done.",
      });
      return;
    }
    setCleaningUploading((current) => ({ ...current, [key]: true }));
    try {
      const files = cleaningCompletionFiles[key];
      const recordType = type === "leaver" ? "leavers" : "transfers";
      const photoPaths = files?.photos.length
        ? await uploadMany(
            "maintenance-media",
            [recordType, record.id, "cleaning", "completion", "photos"],
            files.photos,
          )
        : [];
      const videoPaths = files?.videos.length
        ? await uploadMany(
            "maintenance-media",
            [recordType, record.id, "cleaning", "completion", "videos"],
            files.videos,
          )
        : [];
      const completed = {
        ...record,
        cleaningStatus: "completed" as CleaningStatus,
        cleaningCompletedAt: new Date(),
        cleaningCompletionPhotoPaths: [
          ...(record.cleaningCompletionPhotoPaths ?? []),
          ...photoPaths,
        ],
        cleaningCompletionVideoPaths: [
          ...(record.cleaningCompletionVideoPaths ?? []),
          ...videoPaths,
        ],
      };
      if (type === "leaver") {
        const leaverDone = completed as LeaverRecord;
        setCleanersPendingLeavers((records) =>
          records.filter((item) => item.id !== record.id),
        );
        setCleanersHistoryLeavers((records) => [leaverDone, ...records]);
        await saveLeaverRecord(leaverDone);
      } else {
        const transferDone = completed as TransferRecord;
        setCleanersPendingTransfers((records) =>
          records.filter((item) => item.id !== record.id),
        );
        setCleanersHistoryTransfers((records) => [transferDone, ...records]);
        await saveTransferRecord(transferDone);
      }
      clearCleaningFiles(type, record.id);
      toast.success("Cleaning marked as done", {
        description: inspectionPropertyAddress(record),
      });
    } catch (error) {
      console.error("Could not complete cleaning job", error);
      toast.error("Could not complete cleaning job", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setCleaningUploading((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
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

  function buildReferralDownloadItems(
    record: ReferralRecord | TeamReferralRecord,
  ): DownloadMediaItem[] {
    const room = record.currentRoomNumber || "N/A";
    const address = record.currentProperty || "N/A";

    const items: DownloadMediaItem[] = [];

    if (record.idPhotoPath) {
      items.push({
        bucket: "referral-documents",
        path: record.idPhotoPath,
        label: "SD-10.1 Tenant ID",
        fileName: `SD-10.1-Tenant-ID-(${room})(${address})`,
      });
    }

    if (record.proofOfIncomePath) {
      items.push({
        bucket: "referral-documents",
        path: record.proofOfIncomePath,
        label: "Proof of income",
        fileName: `Proof-of-income-(${room})(${address})`,
      });
    }

    record.sdDocumentPaths?.forEach((path, index) => {
      if (!path) {
        return;
      }
      const slot = SD_SLOTS[index];
      const slotNumber = slot?.code?.replace("SD-", "") ?? String(index + 1);
      const title = slot?.name ?? `Document-${index + 1}`;
      items.push({
        bucket: "sd-documents",
        path,
        label: slot ? `${slot.code} ${slot.name}` : `SD-${index + 1}`,
        fileName: `SD-${slotNumber}-${title}-(${room})(${address})`,
      });
    });

    return items;
  }

  function getRecordMediaItems(
    record:
      | ReferralRecord
      | TeamReferralRecord
      | LeaverRecord
      | TransferRecord,
    viewerModule?: string | null,
  ) {
    if (
      viewerModule === "Maintenance Team" &&
      !("fullName" in record) &&
      ("propertyAddress" in record || "currentProperty" in record)
    ) {
      return [];
    }

    const items: Array<{
      bucket: "referral-documents" | "maintenance-media" | "sd-documents";
      path: string;
      kind: "photo" | "video";
      label?: string;
    }> = [];

    if ("idPhotoPath" in record && record.idPhotoPath) {
      items.push({
        bucket: "referral-documents",
        path: record.idPhotoPath,
        kind: "photo",
        label: "SD-10.1 Tenant ID",
      });
    }
    if ("proofOfIncomePath" in record && record.proofOfIncomePath) {
      items.push({
        bucket: "referral-documents",
        path: record.proofOfIncomePath,
        kind: "photo",
        label: "Proof of income",
      });
    }
    if (
      "sdDocumentPaths" in record &&
      record.sdDocumentPaths &&
      (viewerModule === "HB Claims Team" || viewerModule === "RMS Team")
    ) {
      record.sdDocumentPaths.forEach((path, index) => {
        if (path) {
          const slot = SD_SLOTS[index];
          const label = slot
            ? `${slot.code} ${slot.name}`
            : `SD-${index + 1}`;
          items.push({
            bucket: "sd-documents",
            path,
            kind: "photo",
            label,
          });
        }
      });
    }
    if ("maintenancePhotoPaths" in record && record.maintenancePhotoPaths) {
      record.maintenancePhotoPaths.forEach((path, index) =>
        items.push({
          bucket: "maintenance-media",
          path,
          kind: "photo",
          label: `Maintenance photo ${index + 1}`,
        }),
      );
    }
    if ("maintenanceVideoPaths" in record && record.maintenanceVideoPaths) {
      record.maintenanceVideoPaths.forEach((path, index) =>
        items.push({
          bucket: "maintenance-media",
          path,
          kind: "video",
          label: `Maintenance video ${index + 1}`,
        }),
      );
    }
    if ("inspectionPhotoPaths" in record && record.inspectionPhotoPaths) {
      record.inspectionPhotoPaths.forEach((path, index) =>
        items.push({
          bucket: "maintenance-media",
          path,
          kind: "photo",
          label: `Inspection photo ${index + 1}`,
        }),
      );
    }
    if ("inspectionVideoPaths" in record && record.inspectionVideoPaths) {
      record.inspectionVideoPaths.forEach((path, index) =>
        items.push({
          bucket: "maintenance-media",
          path,
          kind: "video",
          label: `Inspection video ${index + 1}`,
        }),
      );
    }
    if ("cleaningPhotoPaths" in record && record.cleaningPhotoPaths) {
      record.cleaningPhotoPaths.forEach((path, index) =>
        items.push({
          bucket: "maintenance-media",
          path,
          kind: "photo",
          label: `Cleaning brief photo ${index + 1}`,
        }),
      );
    }
    if ("cleaningVideoPaths" in record && record.cleaningVideoPaths) {
      record.cleaningVideoPaths.forEach((path, index) =>
        items.push({
          bucket: "maintenance-media",
          path,
          kind: "video",
          label: `Cleaning brief video ${index + 1}`,
        }),
      );
    }
    if (
      "cleaningCompletionPhotoPaths" in record &&
      record.cleaningCompletionPhotoPaths
    ) {
      record.cleaningCompletionPhotoPaths.forEach((path, index) =>
        items.push({
          bucket: "maintenance-media",
          path,
          kind: "photo",
          label: `Cleaning done photo ${index + 1}`,
        }),
      );
    }
    if (
      "cleaningCompletionVideoPaths" in record &&
      record.cleaningCompletionVideoPaths
    ) {
      record.cleaningCompletionVideoPaths.forEach((path, index) =>
        items.push({
          bucket: "maintenance-media",
          path,
          kind: "video",
          label: `Cleaning done video ${index + 1}`,
        }),
      );
    }

    return items;
  }

  async function completeTeamReferral(
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

    let workingRecord: TeamReferralRecord = record;

    if (department === "HB Claims Team" && outcome === "uploaded") {
      setTeamNewReferrals((queues) => ({
        ...queues,
        "RMS Team": [
          {
            ...workingRecord,
            department: "RMS Team",
            teamOutcome: undefined,
            teamRejectionReason: undefined,
            handledAt: undefined,
            assignedTo: undefined,
            assignedBy: undefined,
            assignedAt: undefined,
            escalationCount: 0,
            escalationPausedAt: undefined,
          },
          ...(queues["RMS Team"] ?? []),
        ],
      }));
    }

    if (department === "Referral Officer" && outcome === "uploaded") {
      const savedPaths = record.sdDocumentPaths ?? [];
      const picked = sdDocumentFiles[record.id] ?? [];
      const missing = BACK_FILLING_SLOT_INDICES.filter(
        (slotIndex) => !(picked[slotIndex] || savedPaths[slotIndex]),
      );
      if (missing.length > 0) {
        toast.error("Missing SD documents", {
          description: `Please upload: ${missing
            .map((slotIndex) => SD_SLOTS[slotIndex].code)
            .join(", ")}`,
        });
        return;
      }

      setSdUploading((prev) => ({ ...prev, [record.id]: true }));
      try {
        const mergedPaths: string[] = [];
        for (let i = 0; i < SD_SLOT_COUNT; i++) {
          const fresh = picked[i];
          if (fresh) {
            const path = await uploadOne(
              "sd-documents",
              ["referral", record.id, SD_SLOTS[i].code],
              fresh,
            );
            mergedPaths.push(path);
          } else {
            mergedPaths.push(savedPaths[i] ?? "");
          }
        }
        workingRecord = {
          ...record,
          sdDocumentPaths: mergedPaths,
        };
        await saveReferralRecord(workingRecord);
        setSdDocumentFiles((prev) => {
          const next = { ...prev };
          delete next[record.id];
          return next;
        });
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : String(uploadError);
        toast.error("Could not upload SD documents", { description: message });
        setSdUploading((prev) => ({ ...prev, [record.id]: false }));
        return;
      }
      setSdUploading((prev) => ({ ...prev, [record.id]: false }));
    }

    const completedRecord: TeamReferralRecord = {
      ...workingRecord,
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

    if (department === "Referral Officer" && outcome === "uploaded") {
      workingRecord = {
        ...workingRecord,
        referralOfficerStatus: "done",
      };
      setTeamNewReferrals((queues) => {
        const next = { ...queues };
        (["HB Claims Team", "Tenants Management"] as const).forEach(
          (team) => {
            next[team] = [
              {
                ...workingRecord,
                department: team,
                teamOutcome: undefined,
                teamRejectionReason: undefined,
                handledAt: undefined,
                assignedTo: undefined,
                assignedBy: undefined,
                assignedAt: undefined,
                escalationCount: 0,
                escalationPausedAt: undefined,
              },
              ...(next[team] ?? []),
            ];
          },
        );
        return next;
      });
    }

    await updateSupabaseTeamStatus("referrals", record.id, department, outcome);

    if (outcome !== "awaiting-information") {
      const lifecycleFromDb = await fetchReferralLifecycleStatuses(record.id);
      const recordForMonday: ReferralRecord = {
        ...workingRecord,
        mondayItemId:
          workingRecord.mondayItemId ?? lifecycleFromDb?.mondayItemId,
        referralOfficerStatus:
          lifecycleFromDb?.referralOfficerStatus ??
          workingRecord.referralOfficerStatus ??
          null,
        hbClaimsStatus:
          lifecycleFromDb?.hbClaimsStatus ?? workingRecord.hbClaimsStatus ?? null,
        rmsStatus: lifecycleFromDb?.rmsStatus ?? workingRecord.rmsStatus ?? null,
        tenantsManagementStatus:
          lifecycleFromDb?.tenantsManagementStatus ??
          workingRecord.tenantsManagementStatus ??
          null,
        timelineEnd:
          lifecycleFromDb?.timelineEnd ?? workingRecord.timelineEnd ?? null,
      };

      await updateMondayTeamStatus(
        "referrals",
        recordForMonday,
        department,
        outcome,
      );
      await syncReferralMondayLifecycle(recordForMonday);
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
      niNumber: "",
      propertyAddress: leaverPropertyAddress.trim(),
      roomNumber: leaverRoomNumber.trim(),
      leavingDate: leaverLeavingDate,
      cleaningType: "",
      maintenanceWorksRequired: "",
      hasMaintenancePhotos: false,
      hasMaintenanceVideos: false,
      createdAt: new Date(),
    };

    const mondayCreated = await createMondayItem("create-leaver", leaverRecord);
    const mondayItemId =
      typeof mondayCreated === "string" ? mondayCreated : mondayCreated?.itemId;
    leaverRecord = {
      ...leaverRecord,
      mondayItemId,
      cleaningType: "cleaning",
      propertyInspected: false,
      maintenanceRequired: false,
    };

    setSupportLeaverHistory((records) => [leaverRecord, ...records]);
    void saveLeaverRecord(leaverRecord);

    setInspectorLeavers((records) => [leaverRecord, ...records]);

    setTeamLeavers((queues) => {
      const nextQueues = { ...queues };

      leaverNotifyModules.forEach((module) => {
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
      niNumber: "",
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

    const mondayCreated = await createMondayItem(
      "create-transfer",
      transferRecord,
    );
    const mondayItemId =
      typeof mondayCreated === "string" ? mondayCreated : mondayCreated?.itemId;
    transferRecord = {
      ...transferRecord,
      mondayItemId,
      cleaningType: "cleaning",
      propertyInspected: false,
      maintenanceRequired: false,
    };

    setSupportTransferHistory((records) => [transferRecord, ...records]);
    void saveTransferRecord(transferRecord);

    setInspectorTransfers((records) => [transferRecord, ...records]);

    setTeamTransfers((queues) => {
      const nextQueues = { ...queues };

      transferNotifyModules.forEach((module) => {
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

  async function completeTeamTransfer(
    department: string,
    record: TransferRecord,
    outcome: "uploaded",
  ) {
    if (
      department !== "Tenants Management" &&
      department !== "HB Claims Team" &&
      department !== "RMS Team"
    ) {
      return;
    }

    const completedRecord: TransferRecord = {
      ...record,
      tenantsManagementStatus:
        department === "Tenants Management"
          ? "done"
          : record.tenantsManagementStatus,
      hbClaimsStatus:
        department === "HB Claims Team" ? "done" : record.hbClaimsStatus,
      rmsStatus: department === "RMS Team" ? "done" : record.rmsStatus,
    };

    setTeamTransfers((queues) => ({
      ...queues,
      [department]: (queues[department] ?? []).filter(
        (item) => item.id !== record.id,
      ),
    }));

    setTeamTransferHistory((queues) => ({
      ...queues,
      [department]: [completedRecord, ...(queues[department] ?? [])],
    }));

    if (department === "HB Claims Team") {
      setTeamTransfers((queues) => ({
        ...queues,
        "RMS Team": [
          { ...completedRecord, department: "RMS Team" },
          ...(queues["RMS Team"] ?? []),
        ],
      }));
    }

    await updateSupabaseTeamStatus("transfers", record.id, department, outcome);

    const lifecycleFromDb = await fetchTransferLifecycleStatuses(record.id);
    const recordForMonday: TransferRecord = {
      ...completedRecord,
      tenantsManagementStatus:
        lifecycleFromDb?.tenantsManagementStatus ??
        completedRecord.tenantsManagementStatus ??
        null,
      hbClaimsStatus:
        lifecycleFromDb?.hbClaimsStatus ?? completedRecord.hbClaimsStatus ?? null,
      rmsStatus: lifecycleFromDb?.rmsStatus ?? completedRecord.rmsStatus ?? null,
      maintenanceStatus:
        lifecycleFromDb?.maintenanceStatus ??
        completedRecord.maintenanceStatus ??
        null,
      propertyInspected:
        lifecycleFromDb?.propertyInspected ??
        completedRecord.propertyInspected ??
        false,
      maintenanceRequired:
        lifecycleFromDb?.maintenanceRequired ??
        completedRecord.maintenanceRequired ??
        false,
    };

    await updateMondayTeamStatus(
      "transfers",
      recordForMonday,
      department,
      outcome,
    );
    await saveTransferRecord(recordForMonday);
    await syncTransferMondayLifecycle(recordForMonday);

    setSelectedHistoryDetail(null);

    toast.success("Marked uploaded", {
      description: `${record.name} - ${department}`,
    });
  }

  async function markTeamTransferUpdated(
    department: string,
    record: TransferRecord,
  ) {
    const scheduleKey = `${department}-${record.id}`;
    const schedule = leaverScheduleDates[scheduleKey] ?? {};

    if (department !== "Maintenance Team" || !schedule.assignedDate) {
      return;
    }

    const inspectionDate =
      record.inspectionCompletedAt ??
      (record.inspectionReport?.completedAt
        ? new Date(record.inspectionReport.completedAt).toISOString().slice(0, 10)
        : undefined);

    const completedRecord: TransferRecord = {
      ...record,
      assignedJobDate: schedule.assignedDate,
      cleaningScheduledDate: schedule.assignedDate,
      maintenanceStatus: "assigned",
    };

    setTeamTransfers((queues) => ({
      ...queues,
      [department]: (queues[department] ?? []).filter(
        (item) => item.id !== record.id,
      ),
    }));

    setMaintenancePendingTransfers((records) => [completedRecord, ...records]);

    await updateSupabaseTeamStatus("transfers", record.id, department, "assigned", {
      assignedDate: schedule.assignedDate,
    });

    const lifecycleFromDb = await fetchTransferLifecycleStatuses(record.id);
    const recordForMonday: TransferRecord = {
      ...completedRecord,
      ...lifecycleFromDb,
      maintenanceStatus: "assigned",
    };

    await updateMondayTeamStatus("transfers", recordForMonday, department, "assigned", {
      inspectionDate,
      assignedDate: schedule.assignedDate,
    });
    await saveTransferRecord(recordForMonday);
    await syncTransferMondayLifecycle(recordForMonday);

    setSelectedHistoryDetail(null);

    toast.success("Transfer assigned", {
      description: `${record.name} - ${department}`,
    });
  }

  async function completeTeamLeaver(
    department: string,
    record: LeaverRecord,
    outcome: "uploaded",
  ) {
    if (
      department !== "Tenants Management" &&
      department !== "HB Claims Team" &&
      department !== "RMS Team"
    ) {
      return;
    }

    const completedRecord: LeaverRecord = {
      ...record,
      tenantsManagementStatus:
        department === "Tenants Management"
          ? "done"
          : record.tenantsManagementStatus,
      hbClaimsStatus:
        department === "HB Claims Team" ? "done" : record.hbClaimsStatus,
      rmsStatus: department === "RMS Team" ? "done" : record.rmsStatus,
    };

    setTeamLeavers((queues) => ({
      ...queues,
      [department]: (queues[department] ?? []).filter(
        (item) => item.id !== record.id,
      ),
    }));

    setTeamLeaverHistory((queues) => ({
      ...queues,
      [department]: [completedRecord, ...(queues[department] ?? [])],
    }));

    if (department === "HB Claims Team") {
      setTeamLeavers((queues) => ({
        ...queues,
        "RMS Team": [
          { ...completedRecord, department: "RMS Team" },
          ...(queues["RMS Team"] ?? []),
        ],
      }));
    }

    await updateSupabaseTeamStatus("leavers", record.id, department, outcome);

    const lifecycleFromDb = await fetchLeaverLifecycleStatuses(record.id);
    const recordForMonday: LeaverRecord = {
      ...completedRecord,
      tenantsManagementStatus:
        lifecycleFromDb?.tenantsManagementStatus ??
        completedRecord.tenantsManagementStatus ??
        null,
      hbClaimsStatus:
        lifecycleFromDb?.hbClaimsStatus ?? completedRecord.hbClaimsStatus ?? null,
      rmsStatus: lifecycleFromDb?.rmsStatus ?? completedRecord.rmsStatus ?? null,
      maintenanceStatus:
        lifecycleFromDb?.maintenanceStatus ??
        completedRecord.maintenanceStatus ??
        null,
      propertyInspected:
        lifecycleFromDb?.propertyInspected ??
        completedRecord.propertyInspected ??
        false,
      maintenanceRequired:
        lifecycleFromDb?.maintenanceRequired ??
        completedRecord.maintenanceRequired ??
        false,
    };

    await updateMondayTeamStatus(
      "leavers",
      recordForMonday,
      department,
      outcome,
    );
    await saveLeaverRecord(recordForMonday);
    await syncLeaverMondayLifecycle(recordForMonday);

    setSelectedHistoryDetail(null);

    toast.success("Marked uploaded", {
      description: `${record.name} - ${department}`,
    });
  }

  async function markTeamLeaverUpdated(department: string, record: LeaverRecord) {
    const scheduleKey = `${department}-${record.id}`;
    const schedule = leaverScheduleDates[scheduleKey] ?? {};

    if (department !== "Maintenance Team" || !schedule.assignedDate) {
      return;
    }

    const inspectionDate =
      record.inspectionCompletedAt ??
      (record.inspectionReport?.completedAt
        ? new Date(record.inspectionReport.completedAt).toISOString().slice(0, 10)
        : undefined);

    const completedRecord: LeaverRecord = {
      ...record,
      assignedJobDate: schedule.assignedDate,
      cleaningScheduledDate: schedule.assignedDate,
      maintenanceStatus: "assigned",
    };

    setTeamLeavers((queues) => ({
      ...queues,
      [department]: (queues[department] ?? []).filter(
        (item) => item.id !== record.id,
      ),
    }));

    setMaintenancePendingLeavers((records) => [completedRecord, ...records]);

    await updateSupabaseTeamStatus("leavers", record.id, department, "assigned", {
      assignedDate: schedule.assignedDate,
    });

    const lifecycleFromDb = await fetchLeaverLifecycleStatuses(record.id);
    const recordForMonday: LeaverRecord = {
      ...completedRecord,
      ...lifecycleFromDb,
      maintenanceStatus: "assigned",
    };

    await updateMondayTeamStatus("leavers", recordForMonday, department, "assigned", {
      inspectionDate,
      assignedDate: schedule.assignedDate,
    });
    await saveLeaverRecord(recordForMonday);
    await syncLeaverMondayLifecycle(recordForMonday);

    setSelectedHistoryDetail(null);

    toast.success("Leaver assigned", {
      description: `${record.name} - ${department}`,
    });
  }

  async function completeMaintenancePendingJob(
    record: LeaverRecord | TransferRecord,
    type: "leaver" | "transfer",
  ) {
    const evidenceKey = getMaintenanceEvidenceKey(type, record.id);
    const evidence = maintenanceCompletionEvidence[evidenceKey];
    if (!evidence?.hasPhotos || !evidence?.hasVideos) {
      return;
    }

    const needsCleaningAnswer = maintenanceNeedsCleaning[evidenceKey];
    if (needsCleaningAnswer === undefined || needsCleaningAnswer === null) {
      toast.error("Answer the cleaning question", {
        description: "Tell us whether this site needs cleaning afterwards.",
      });
      return;
    }

    const files = maintenanceCompletionFiles[evidenceKey];
    const existingPhotos = record.maintenancePhotoPaths ?? [];
    const existingVideos = record.maintenanceVideoPaths ?? [];

    setMaintenanceUploading((current) => ({ ...current, [evidenceKey]: true }));

    let uploadedPhotos: string[] = [];
    let uploadedVideos: string[] = [];

    try {
      if (files?.photos.length) {
        uploadedPhotos = await uploadMany(
          "maintenance-media",
          [type === "leaver" ? "leavers" : "transfers", record.id, "photos"],
          files.photos,
        );
      }
      if (files?.videos.length) {
        uploadedVideos = await uploadMany(
          "maintenance-media",
          [type === "leaver" ? "leavers" : "transfers", record.id, "videos"],
          files.videos,
        );
      }
    } catch (error) {
      console.error("Could not upload maintenance media", error);
      toast.error("Could not upload completion media", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      setMaintenanceUploading((current) => {
        const next = { ...current };
        delete next[evidenceKey];
        return next;
      });
      return;
    }

    setMaintenanceUploading((current) => {
      const next = { ...current };
      delete next[evidenceKey];
      return next;
    });

    const allPhotos = [...existingPhotos, ...uploadedPhotos];
    const allVideos = [...existingVideos, ...uploadedVideos];

    const cleaningHandoff: CleaningFields = needsCleaningAnswer
      ? {
          cleaningStatus: "pending",
          cleaningRequestSource: "maintenance",
          cleaningRequestedAt: new Date(),
          cleaningDescription:
            record.cleaningDescription ??
            ("propertyAddress" in record
              ? `Cleaning needed after maintenance at ${record.propertyAddress} room ${record.roomNumber}.`
              : `Cleaning needed after maintenance at ${(record as TransferRecord).currentProperty} room ${(record as TransferRecord).currentRoomNumber}.`),
          cleaningPhotoPaths: [
            ...(record.cleaningPhotoPaths ?? []),
            ...uploadedPhotos,
          ],
          cleaningVideoPaths: [
            ...(record.cleaningVideoPaths ?? []),
            ...uploadedVideos,
          ],
        }
      : {};

    setMaintenanceNeedsCleaning((current) => {
      const next = { ...current };
      delete next[evidenceKey];
      return next;
    });

    if (type === "leaver" && "propertyAddress" in record) {
      const completedRecord: LeaverRecord = {
        ...record,
        hasMaintenancePhotos: allPhotos.length > 0,
        hasMaintenanceVideos: allVideos.length > 0,
        maintenancePhotoPaths: allPhotos,
        maintenanceVideoPaths: allVideos,
        maintenanceStatus: "done",
        ...cleaningHandoff,
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
      if (needsCleaningAnswer) {
        setCleanersPendingLeavers((records) => [completedRecord, ...records]);
      }
      setMaintenanceCompletionEvidence((current) => {
        const next = { ...current };
        delete next[evidenceKey];
        return next;
      });
      clearMaintenanceFiles(type, record.id);
      await updateSupabaseTeamStatus(
        "leavers",
        record.id,
        "Maintenance Team",
        "completed",
      );
      const lifecycleFromDb = await fetchLeaverLifecycleStatuses(record.id);
      const recordForMonday: LeaverRecord = {
        ...completedRecord,
        ...lifecycleFromDb,
        maintenanceStatus: "done",
      };
      await updateMondayTeamStatus(
        "leavers",
        recordForMonday,
        "Maintenance Team",
        "completed",
      );
      await saveLeaverRecord(recordForMonday);
      await syncLeaverMondayLifecycle(recordForMonday);
      toast.success(
        needsCleaningAnswer ? "Sent to Cleaners" : "Job marked done",
        {
          description: needsCleaningAnswer
            ? `${record.propertyAddress} now waiting on cleaning.`
            : `${record.propertyAddress} is ready.`,
        },
      );
      return;
    }

    if (type === "transfer" && "currentProperty" in record) {
      const completedRecord: TransferRecord = {
        ...record,
        hasMaintenancePhotos: allPhotos.length > 0,
        hasMaintenanceVideos: allVideos.length > 0,
        maintenancePhotoPaths: allPhotos,
        maintenanceVideoPaths: allVideos,
        maintenanceStatus: "done",
        ...cleaningHandoff,
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
      if (needsCleaningAnswer) {
        setCleanersPendingTransfers((records) => [
          completedRecord,
          ...records,
        ]);
      }
      setMaintenanceCompletionEvidence((current) => {
        const next = { ...current };
        delete next[evidenceKey];
        return next;
      });
      clearMaintenanceFiles(type, record.id);
      await updateSupabaseTeamStatus(
        "transfers",
        record.id,
        "Maintenance Team",
        "completed",
      );
      const lifecycleFromDb = await fetchTransferLifecycleStatuses(record.id);
      const recordForMonday: TransferRecord = {
        ...completedRecord,
        ...lifecycleFromDb,
        maintenanceStatus: "done",
      };
      await updateMondayTeamStatus(
        "transfers",
        recordForMonday,
        "Maintenance Team",
        "completed",
      );
      await saveTransferRecord(recordForMonday);
      await syncTransferMondayLifecycle(recordForMonday);
      toast.success(
        needsCleaningAnswer ? "Sent to Cleaners" : "Job marked done",
        {
          description: needsCleaningAnswer
            ? `${record.currentProperty} now waiting on cleaning.`
            : `${record.currentProperty} is ready.`,
        },
      );
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

  function resetInspectionSummary() {
    setInspectionMaintenanceRequested(null);
    setInspectionCleaningRequested(null);
    setInspectionMaintenanceDraft([]);
    setInspectionCleaningDraft([]);
    setInspectionItemFilesByKey({});
  }

  function openInspectionForm(record: LeaverRecord | TransferRecord) {
    setSelectedInspectionTarget(record);
    resetInspectionSummary();
  }

  function closeInspectionForm() {
    setSelectedInspectionTarget(null);
    resetInspectionSummary();
  }

  function addInspectionMaintenanceItem() {
    setInspectionMaintenanceDraft((items) => [
      ...items,
      { id: Date.now(), description: "", photoCount: 0, videoCount: 0 },
    ]);
  }

  function addInspectionCleaningItem() {
    setInspectionCleaningDraft((items) => [
      ...items,
      { id: Date.now(), description: "", photoCount: 0, videoCount: 0 },
    ]);
  }

  function updateInspectionMaintenanceItem(
    id: number,
    updates: Partial<InspectionProblem>,
  ) {
    setInspectionMaintenanceDraft((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

  function updateInspectionCleaningItem(
    id: number,
    updates: Partial<InspectionProblem>,
  ) {
    setInspectionCleaningDraft((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

  function removeInspectionMaintenanceItem(id: number) {
    setInspectionMaintenanceDraft((items) =>
      items.filter((item) => item.id !== id),
    );
    setInspectionItemFilesByKey((current) => {
      const next = { ...current };
      delete next[inspectionItemKey("maintenance", id)];
      return next;
    });
  }

  function removeInspectionCleaningItem(id: number) {
    setInspectionCleaningDraft((items) =>
      items.filter((item) => item.id !== id),
    );
    setInspectionItemFilesByKey((current) => {
      const next = { ...current };
      delete next[inspectionItemKey("cleaning", id)];
      return next;
    });
  }

  async function uploadInspectionDraftItems(
    recordType: "leavers" | "transfers",
    recordId: number,
    kind: "maintenance" | "cleaning",
    items: InspectionProblem[],
  ) {
    const enriched: InspectionProblem[] = [];
    const photoPaths: string[] = [];
    const videoPaths: string[] = [];

    for (const item of items) {
      const fileKey = inspectionItemKey(kind, item.id);
      const files = inspectionItemFiles[fileKey];
      const itemPhotoPaths = files?.photos.length
        ? await uploadMany(
            "maintenance-media",
            [recordType, recordId, "inspection", kind, item.id, "photos"],
            files.photos,
          )
        : [];
      const itemVideoPaths = files?.videos.length
        ? await uploadMany(
            "maintenance-media",
            [recordType, recordId, "inspection", kind, item.id, "videos"],
            files.videos,
          )
        : [];

      enriched.push({
        ...item,
        photoPaths: itemPhotoPaths,
        videoPaths: itemVideoPaths,
      });
      photoPaths.push(...itemPhotoPaths);
      videoPaths.push(...itemVideoPaths);
    }

    return { enriched, photoPaths, videoPaths };
  }

  async function completeInspection(record: LeaverRecord | TransferRecord) {
    if (!isInspectionFormReady()) {
      if (
        inspectionMaintenanceRequested === null ||
        inspectionCleaningRequested === null
      ) {
        toast.error("Answer maintenance and cleaning", {
          description:
            "Choose whether maintenance and cleaning are required before submitting.",
        });
        return;
      }

      toast.error("Add a description", {
        description:
          "Each selected maintenance or cleaning item needs a description.",
      });
      return;
    }

    const maintenanceItems = inspectionMaintenanceRequested
      ? inspectionMaintenanceDraft.filter(
          (item) => item.description.trim().length > 0,
        )
      : [];
    const cleaningItems = inspectionCleaningRequested
      ? inspectionCleaningDraft.filter((item) => item.description.trim().length > 0)
      : [];

    setInspectionUploading(true);

    const recordType = isLeaverRecord(record) ? "leavers" : "transfers";
    let maintenanceProblems: InspectionProblem[] = [];
    let maintenancePhotoPaths: string[] = [];
    let maintenanceVideoPaths: string[] = [];
    let cleaningPhotoPaths: string[] = [];
    let cleaningVideoPaths: string[] = [];

    try {
      if (maintenanceItems.length > 0) {
        const maintenanceUpload = await uploadInspectionDraftItems(
          recordType,
          record.id,
          "maintenance",
          maintenanceItems,
        );
        maintenanceProblems = maintenanceUpload.enriched;
        maintenancePhotoPaths = maintenanceUpload.photoPaths;
        maintenanceVideoPaths = maintenanceUpload.videoPaths;
      }

      if (cleaningItems.length > 0) {
        const cleaningUpload = await uploadInspectionDraftItems(
          recordType,
          record.id,
          "cleaning",
          cleaningItems,
        );
        cleaningPhotoPaths = cleaningUpload.photoPaths;
        cleaningVideoPaths = cleaningUpload.videoPaths;
      }
    } catch (error) {
      console.error("Could not upload inspection media", error);
      toast.error("Could not upload inspection media", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      setInspectionUploading(false);
      return;
    }

    setInspectionUploading(false);

    const allPhotoPaths = [...maintenancePhotoPaths, ...cleaningPhotoPaths];
    const allVideoPaths = [...maintenanceVideoPaths, ...cleaningVideoPaths];
    const cleaningType = inspectionMaintenanceRequested
      ? "maintenance"
      : inspectionCleaningRequested
        ? "cleaning"
        : "";

    const report: InspectionReport = {
      problems: maintenanceProblems,
      completedAt: new Date(),
      inspectorName,
      maintenanceRequested: Boolean(inspectionMaintenanceRequested),
      maintenanceDescription: inspectionMaintenanceRequested
        ? maintenanceItems.map((item) => item.description.trim()).join("\n\n")
        : undefined,
      maintenancePhotoPaths: inspectionMaintenanceRequested
        ? maintenancePhotoPaths
        : undefined,
      maintenanceVideoPaths: inspectionMaintenanceRequested
        ? maintenanceVideoPaths
        : undefined,
      cleaningRequested: Boolean(inspectionCleaningRequested),
      cleaningDescription: inspectionCleaningRequested
        ? cleaningItems.map((item) => item.description.trim()).join("\n\n")
        : undefined,
      cleaningPhotoPaths: inspectionCleaningRequested
        ? cleaningPhotoPaths
        : undefined,
      cleaningVideoPaths: inspectionCleaningRequested
        ? cleaningVideoPaths
        : undefined,
    };

    const cleaningStamp: CleaningFields = inspectionCleaningRequested
      ? {
          cleaningStatus: "pending",
          cleaningRequestSource: "inspector",
          cleaningRequestedAt: new Date(),
          cleaningDescription: cleaningItems
            .map((item) => item.description.trim())
            .join("\n\n"),
          cleaningPhotoPaths,
          cleaningVideoPaths,
        }
      : {};

    const summaryParts: string[] = [];
    if (inspectionMaintenanceRequested) {
      summaryParts.push("Maintenance Team");
    }
    if (inspectionCleaningRequested) {
      summaryParts.push("Cleaners");
    }
    if (summaryParts.length === 0) {
      summaryParts.push("history only");
    }

    if (isLeaverRecord(record)) {
      const inspectionIso = report.completedAt.toISOString();
      const completed: LeaverRecord = {
        ...record,
        cleaningType: "cleaning",
        propertyInspected: true,
        maintenanceRequired: Boolean(inspectionMaintenanceRequested),
        inspectionCompletedAt: inspectionIso.slice(0, 10),
        inspectionReport: report,
        inspectionPhotoPaths: allPhotoPaths,
        inspectionVideoPaths: allVideoPaths,
        ...cleaningStamp,
      };
      setInspectorLeavers((records) =>
        records.filter((item) => item.id !== record.id),
      );
      setInspectorHistory((records) => [completed, ...records]);
      if (inspectionMaintenanceRequested) {
        setTeamLeavers((queues) => ({
          ...queues,
          "Maintenance Team": [
            { ...completed, department: "Maintenance Team" },
            ...(queues["Maintenance Team"] ?? []),
          ],
        }));
      }
      if (inspectionCleaningRequested) {
        setCleanersPendingLeavers((records) => [completed, ...records]);
      }
      await saveLeaverRecord(completed);
      if (completed.mondayItemId) {
        await fetch("/api/monday", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-property-inspected",
            board: "leavers",
            itemId: completed.mondayItemId,
            inspected: true,
          }),
        });
      }
      await syncLeaverMondayLifecycle(completed);
    } else {
      const inspectionIso = report.completedAt.toISOString();
      const completed: TransferRecord = {
        ...record,
        cleaningType: "cleaning",
        propertyInspected: true,
        maintenanceRequired: Boolean(inspectionMaintenanceRequested),
        inspectionCompletedAt: inspectionIso.slice(0, 10),
        inspectionReport: report,
        inspectionPhotoPaths: allPhotoPaths,
        inspectionVideoPaths: allVideoPaths,
        ...cleaningStamp,
      };
      setInspectorTransfers((records) =>
        records.filter((item) => item.id !== record.id),
      );
      setInspectorHistory((records) => [completed, ...records]);
      if (inspectionMaintenanceRequested) {
        setTeamTransfers((queues) => ({
          ...queues,
          "Maintenance Team": [
            { ...completed, department: "Maintenance Team" },
            ...(queues["Maintenance Team"] ?? []),
          ],
        }));
      }
      if (inspectionCleaningRequested) {
        setCleanersPendingTransfers((records) => [completed, ...records]);
      }
      await saveTransferRecord(completed);
      if (completed.mondayItemId) {
        await fetch("/api/monday", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-property-inspected",
            board: "transfers",
            itemId: completed.mondayItemId,
            inspected: true,
          }),
        });
      }
      await syncTransferMondayLifecycle(completed);
    }

    closeInspectionForm();
    toast.success("Inspection complete", {
      description: `${inspectionPropertyAddress(record)} sent to: ${summaryParts.join(", ")}`,
    });
  }

  async function uploadIntakeFiles(recordId: number) {
    const updates: Partial<ReferralRecord> = {};
    const tasks: Promise<void>[] = [];

    if (idPhotoFile) {
      tasks.push(
        uploadOne("referral-documents", ["referrals", recordId, "id"], idPhotoFile)
          .then((path) => {
            updates.idPhotoPath = path;
          }),
      );
    }

    if (proofOfIncomeFile) {
      tasks.push(
        uploadOne(
          "referral-documents",
          ["referrals", recordId, "proof-of-income"],
          proofOfIncomeFile,
        ).then((path) => {
          updates.proofOfIncomePath = path;
        }),
      );
    }

    if (tasks.length === 0) {
      return updates;
    }

    setIntakeUploading(true);
    try {
      await Promise.all(tasks);
    } catch (error) {
      console.error("Could not upload intake documents", error);
      toast.error("Could not upload documents", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIntakeUploading(false);
    }

    return updates;
  }

  async function savePassedReferralOfficer() {
    if (!passedReferralId || !passedReferralOfficer.trim()) {
      toast.error("Select a Referral Officer.");
      return;
    }

    const officer = passedReferralOfficer.trim();
    let saved: ReferralRecord | undefined;

    setDriverQueue((records) => {
      const next = records.map((record) => {
        if (record.id === passedReferralId) {
          saved = { ...record, referralOfficer: officer };
          return saved;
        }
        return record;
      });
      return next;
    });

    if (saved) {
      await saveReferralRecord(saved);
    }

    setPassedReferralId(null);
    setPassedReferralOfficer("");
  }

  async function handleReferralSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (referralStep < totalReferralSteps) {
      if (referralStep === 2) {
        if (!tenantType.trim()) {
          toast.error("Tenant type is required", {
            description: "Please choose Single or Family before continuing.",
          });
          return;
        }
        const ageNum = age !== "" ? Number(age) : NaN;
        if (!Number.isNaN(ageNum) && ageNum < 18) {
          setEligibilityResult({
            status: "failed",
            reasons: ["Tenant must be 18 or over."],
            title: "Not eligible",
            message:
              "Referrals are only accepted for tenants aged 18 and over. There is no need to collect NI number or proof of income for this referral.",
          });
          return;
        }
      }
      setReferralStep((currentStep) => currentStep + 1);
      setEligibilityResult(null);
      return;
    }

    const failureReasons = [];
    const documentFailureReasons = [];

    const ageNum = age !== "" ? Number(age) : NaN;
    if (!Number.isNaN(ageNum) && ageNum < 18) {
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
      let record = createReferralRecord("driver", []);
      const uploaded = await uploadIntakeFiles(record.id);
      record = { ...record, ...uploaded };
      setFollowUps((records) =>
        records.filter((followUp) => followUp.id !== editingFollowUpId),
      );
      setDriverQueue((records) => [record, ...records]);
      void saveReferralRecord(record);
      setPassedReferralOfficer(
        referralType === "sourced" && referralOfficer ? referralOfficer : "",
      );
      setPassedReferralId(record.id);
      setEligibilityResult({
        status: "passed",
        reasons: [],
      });
      toast.success("Referral submitted", {
        description: `${record.fullName} sent to Referral Officer queue`,
      });
      return;
    }

    if (editingFollowUpId) {
      let record = createReferralRecord("failed", failureReasons);
      const uploaded = await uploadIntakeFiles(record.id);
      record = { ...record, ...uploaded };
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
      let record = createReferralRecord("follow-up", documentFailureReasons);
      const uploaded = await uploadIntakeFiles(record.id);
      record = { ...record, ...uploaded };
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

    let record = createReferralRecord("failed", failureReasons);
    const uploaded = await uploadIntakeFiles(record.id);
    record = { ...record, ...uploaded };
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

  const toaster = (
    <Toaster
      closeButton
      position="top-right"
      richColors
      theme={theme}
      toastOptions={{
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          color: "var(--foreground)",
        },
      }}
    />
  );

  const managerTeams: Array<{ label: string; pending: number }> = [
    {
      label: "Referral Officer",
      pending: managerReferralRows.filter((row) => {
        const s = row.statusByDepartment["Referral Officer"];
        return s !== undefined && s !== "Done" && s !== "Rejected";
      }).length,
    },
    {
      label: "RMS Team",
      pending: managerReferralRows.filter((row) => {
        const s = row.statusByDepartment["RMS Team"];
        return s !== undefined && s !== "Done" && s !== "Rejected";
      }).length,
    },
    {
      label: "HB Claims Team",
      pending: managerReferralRows.filter((row) => {
        const s = row.statusByDepartment["HB Claims Team"];
        return s !== undefined && s !== "Done" && s !== "Rejected";
      }).length,
    },
    {
      label: "Tenants Management",
      pending: managerReferralRows.filter((row) => {
        const s = row.statusByDepartment["Tenants Management"];
        return s !== undefined && s !== "Done" && s !== "Rejected";
      }).length,
    },
    {
      label: "Maintenance Team",
      pending:
        maintenancePendingLeavers.length + maintenancePendingTransfers.length,
    },
    {
      label: "Inspector",
      pending: inspectorLeavers.length + inspectorTransfers.length,
    },
    {
      label: "Cleaners",
      pending:
        cleanersPendingLeavers.length + cleanersPendingTransfers.length,
    },
  ];

  function openManagerSection(section: "dashboard" | "users" | "team", team?: string) {
    setManagerView(section);
    setManagerTeam(team ?? null);
  }

  const managerSidebar = (
    <aside className="manager-sidebar" aria-label="Manager navigation">
      <button
        className="manager-sidebar-back"
        onClick={() => {
          setSelectedModule(null);
          setManagerView("dashboard");
          setManagerTeam(null);
        }}
        type="button"
      >
        ← Back to modules
      </button>
      <button
        className={`manager-nav-item${
          managerView === "dashboard" ? " active" : ""
        }`}
        onClick={() => openManagerSection("dashboard")}
        type="button"
      >
        <span>Dashboard</span>
      </button>
      {managerTeams.map((entry) => {
        const isActive =
          managerView === "team" && managerTeam === entry.label;
        return (
          <button
            className={`manager-nav-item${isActive ? " active" : ""}`}
            key={entry.label}
            onClick={() => openManagerSection("team", entry.label)}
            type="button"
          >
            <span>{entry.label}</span>
            <span
              className={`manager-nav-badge${entry.pending === 0 ? " zero" : ""}`}
            >
              {entry.pending}
            </span>
          </button>
        );
      })}
      <div className="manager-sidebar-divider" />
      <button
        className={`manager-nav-item${
          managerView === "users" ? " active" : ""
        }`}
        onClick={() => openManagerSection("users")}
        type="button"
      >
        <span>Manage users</span>
      </button>
    </aside>
  );

  function pillClassForStatus(status: string | undefined) {
    if (!status) {
      return "";
    }
    const slug = status.toLowerCase().replace(/\s+/g, "-");
    return `kpi-status-pill ${slug}`;
  }

  if (!authReady) {
    return (
      <main className="module-page">
        {toaster}
        <div className="background-bubble bubble-one" />
        <div className="background-bubble bubble-two" />
        <div className="background-bubble bubble-three" />
        <section className="auth-loading">
          <p>Loading…</p>
        </section>
      </main>
    );
  }

  if (!currentProfile) {
    return (
      <main className="module-page">
        {toaster}
        <div className="background-bubble bubble-one" />
        <div className="background-bubble bubble-two" />
        <div className="background-bubble bubble-three" />
        <LoginScreen onAuthenticated={() => void getCurrentProfile().then(setCurrentProfile)} />
      </main>
    );
  }

  const isManagerView = currentProfile.role === "Manager";

  return (
    <main className="module-page">
      {toaster}
      <div className="background-bubble bubble-one" />
      <div className="background-bubble bubble-two" />
      <div className="background-bubble bubble-three" />

      <header className="session-bar">
        <span className="session-info">
          Signed in as <strong>{currentProfile.fullName}</strong>
          <em>{currentProfile.role}</em>
        </span>
        <div className="session-bar-actions">
          <ThemeToggle />
          <button
            className="secondary-button compact-session-button"
            onClick={() => void handleSignOut()}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>

      {isManagerView &&
      selectedModule === "Manager" &&
      managerView === "team" &&
      managerTeam ? (
        <div className="manager-shell">
          {managerSidebar}
          <section className="records-panel manager-main">
          {(() => {
            const team = managerTeam;
            if (
              team === "Referral Officer" ||
              team === "RMS Team" ||
              team === "HB Claims Team" ||
              team === "Tenants Management"
            ) {
              const departmentRows = managerReferralRows.filter(
                (row) => row.statusByDepartment[team] !== undefined,
              );
              const isCompleted = (status: string | undefined) =>
                status === "Done" ||
                status === "Rejected";
              const pendingRows = departmentRows.filter(
                (row) => !isCompleted(row.statusByDepartment[team]),
              );
              const completedRows = departmentRows.filter((row) =>
                isCompleted(row.statusByDepartment[team]),
              );
              return (
                <>
                  <div className="records-heading">
                    <h2>{team}</h2>
                    <p>Pending versus completed referrals for this team.</p>
                  </div>
                  <div className="manager-kpi-grid">
                    <article className="manager-kpi-card manager-kpi-card-pending">
                      <strong>Pending</strong>
                      <span>
                        <KpiNumber value={pendingRows.length} />
                      </span>
                    </article>
                    <article className="manager-kpi-card manager-kpi-card-success">
                      <strong>Completed</strong>
                      <span>
                        <KpiNumber value={completedRows.length} />
                      </span>
                    </article>
                  </div>
                  <section className="manager-team-section">
                    <div className="manager-team-header">
                      <h3>Referrals</h3>
                      <small>
                        Each row shows who logged the referral and where it
                        sits.
                      </small>
                    </div>
                    {departmentRows.length === 0 ? (
                      <p className="empty-records">No referrals yet.</p>
                    ) : (
                      <div className="manager-table-wrap">
                        <table className="manager-table">
                          <thead>
                            <tr>
                              <th>Tenant</th>
                              <th>Referral officer (who logged)</th>
                              <th>Submitted</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {departmentRows.map(({ record, statusByDepartment }) => {
                              const status = statusByDepartment[team];
                              return (
                                <tr key={record.id}>
                                  <td>{record.fullName}</td>
                                  <td>{record.referralOfficer || "—"}</td>
                                  <td>{formatDisplayDate(record.createdAt)}</td>
                                  <td>
                                    {status ? (
                                      <span className={pillClassForStatus(status)}>
                                        {status}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              );
            }

            if (team === "Maintenance Team") {
              const pendingLeavers = maintenancePendingLeavers;
              const pendingTransfers = maintenancePendingTransfers;
              const completedLeavers =
                teamLeaverHistory["Maintenance Team"] ?? [];
              const completedTransfers =
                teamTransferHistory["Maintenance Team"] ?? [];
              const pendingCount =
                pendingLeavers.length + pendingTransfers.length;
              const completedCount =
                completedLeavers.length + completedTransfers.length;
              const allRows: Array<{
                key: string;
                address: string;
                dateAsked: Date;
                dateAssigned?: string;
                requestedBy: string;
                status: string;
              }> = [];
              pendingLeavers.forEach((r) =>
                allRows.push({
                  key: `mp-leaver-${r.id}`,
                  address: `${r.propertyAddress} | Room ${r.roomNumber}`,
                  dateAsked:
                    r.inspectionReport?.completedAt ?? r.createdAt,
                  dateAssigned: r.assignedJobDate,
                  requestedBy:
                    r.inspectionReport?.inspectorName ?? r.assignedBy ?? "—",
                  status: "Pending",
                }),
              );
              pendingTransfers.forEach((r) =>
                allRows.push({
                  key: `mp-transfer-${r.id}`,
                  address: `${r.currentProperty} | Room ${r.currentRoomNumber}`,
                  dateAsked:
                    r.inspectionReport?.completedAt ?? r.createdAt,
                  dateAssigned: r.assignedJobDate,
                  requestedBy:
                    r.inspectionReport?.inspectorName ?? r.assignedBy ?? "—",
                  status: "Pending",
                }),
              );
              completedLeavers.forEach((r) =>
                allRows.push({
                  key: `mc-leaver-${r.id}`,
                  address: `${r.propertyAddress} | Room ${r.roomNumber}`,
                  dateAsked:
                    r.inspectionReport?.completedAt ?? r.createdAt,
                  dateAssigned: r.assignedJobDate,
                  requestedBy:
                    r.inspectionReport?.inspectorName ?? r.assignedBy ?? "—",
                  status: "Completed",
                }),
              );
              completedTransfers.forEach((r) =>
                allRows.push({
                  key: `mc-transfer-${r.id}`,
                  address: `${r.currentProperty} | Room ${r.currentRoomNumber}`,
                  dateAsked:
                    r.inspectionReport?.completedAt ?? r.createdAt,
                  dateAssigned: r.assignedJobDate,
                  requestedBy:
                    r.inspectionReport?.inspectorName ?? r.assignedBy ?? "—",
                  status: "Completed",
                }),
              );
              allRows.sort(
                (a, b) => b.dateAsked.getTime() - a.dateAsked.getTime(),
              );

              return (
                <>
                  <div className="records-heading">
                    <h2>Maintenance Team</h2>
                    <p>Maintenance jobs across all properties.</p>
                  </div>
                  <div className="manager-kpi-grid">
                    <article className="manager-kpi-card manager-kpi-card-pending">
                      <strong>Pending jobs</strong>
                      <span>
                        <KpiNumber value={pendingCount} />
                      </span>
                    </article>
                    <article className="manager-kpi-card manager-kpi-card-success">
                      <strong>Completed</strong>
                      <span>
                        <KpiNumber value={completedCount} />
                      </span>
                    </article>
                  </div>
                  <section className="manager-team-section">
                    <div className="manager-team-header">
                      <h3>Jobs</h3>
                      <small>
                        Address, date asked, date assigned, requester and
                        current status.
                      </small>
                    </div>
                    {allRows.length === 0 ? (
                      <p className="empty-records">
                        No maintenance work tracked yet.
                      </p>
                    ) : (
                      <div className="manager-table-wrap">
                        <table className="manager-table">
                          <thead>
                            <tr>
                              <th>Address</th>
                              <th>Date asked</th>
                              <th>Date assigned</th>
                              <th>Requested by</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allRows.map((row) => (
                              <tr key={row.key}>
                                <td>{row.address}</td>
                                <td>{formatDisplayDate(row.dateAsked)}</td>
                                <td>
                                  {row.dateAssigned
                                    ? formatDisplayDate(row.dateAssigned)
                                    : "—"}
                                </td>
                                <td>{row.requestedBy}</td>
                                <td>
                                  <span className={pillClassForStatus(row.status)}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              );
            }

            if (team === "Inspector") {
              const pendingLeavers = inspectorLeavers;
              const pendingTransfers = inspectorTransfers;
              const inspected = inspectorHistory;
              return (
                <>
                  <div className="records-heading">
                    <h2>Inspector</h2>
                    <p>
                      Properties waiting on inspection and those already
                      inspected.
                    </p>
                  </div>
                  <div className="manager-kpi-grid">
                    <article className="manager-kpi-card manager-kpi-card-pending">
                      <strong>Pending inspection</strong>
                      <span>
                        <KpiNumber
                          value={
                            pendingLeavers.length + pendingTransfers.length
                          }
                        />
                      </span>
                    </article>
                    <article className="manager-kpi-card manager-kpi-card-success">
                      <strong>Inspected</strong>
                      <span>
                        <KpiNumber value={inspected.length} />
                      </span>
                    </article>
                  </div>
                  <section className="manager-team-section">
                    <div className="manager-team-header">
                      <h3>Pending inspection</h3>
                    </div>
                    {pendingLeavers.length + pendingTransfers.length === 0 ? (
                      <p className="empty-records">
                        Nothing awaiting inspection.
                      </p>
                    ) : (
                      <ul className="manager-simple-list" role="list">
                        {pendingLeavers.map((r) => (
                          <li key={`ipl-${r.id}`}>
                            <strong>{r.propertyAddress}</strong>
                            <small>
                              Room {r.roomNumber} · Leaver · added{" "}
                              {formatDisplayDate(r.createdAt)}
                            </small>
                          </li>
                        ))}
                        {pendingTransfers.map((r) => (
                          <li key={`ipt-${r.id}`}>
                            <strong>{r.currentProperty}</strong>
                            <small>
                              Room {r.currentRoomNumber} · Transfer · added{" "}
                              {formatDisplayDate(r.createdAt)}
                            </small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="manager-team-section">
                    <div className="manager-team-header">
                      <h3>Inspected</h3>
                    </div>
                    {inspected.length === 0 ? (
                      <p className="empty-records">No inspections yet.</p>
                    ) : (
                      <ul className="manager-simple-list" role="list">
                        {inspected.map((r) => (
                          <li key={`ih-${r.id}`}>
                            <strong>{inspectionPropertyAddress(r)}</strong>
                            <small>
                              Room {inspectionRoomNumber(r)} · inspected{" "}
                              {r.inspectionReport?.completedAt
                                ? formatDisplayDate(
                                    r.inspectionReport.completedAt,
                                  )
                                : "—"}
                            </small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              );
            }

            if (team === "Cleaners") {
              const allCleaning: Array<{
                key: string;
                address: string;
                source: string;
                dateAsked?: Date;
                dateAssigned?: Date;
                status: string;
              }> = [];
              cleanersPendingLeavers.forEach((r) =>
                allCleaning.push({
                  key: `clp-l-${r.id}`,
                  address: `${r.propertyAddress} | Room ${r.roomNumber}`,
                  source:
                    r.cleaningRequestSource === "maintenance"
                      ? "Maintenance"
                      : "Inspector",
                  dateAsked: r.cleaningRequestedAt,
                  dateAssigned: r.cleaningAssignedAt,
                  status:
                    r.cleaningStatus === "assigned" ? "Assigned" : "Pending",
                }),
              );
              cleanersPendingTransfers.forEach((r) =>
                allCleaning.push({
                  key: `clp-t-${r.id}`,
                  address: `${r.currentProperty} | Room ${r.currentRoomNumber}`,
                  source:
                    r.cleaningRequestSource === "maintenance"
                      ? "Maintenance"
                      : "Inspector",
                  dateAsked: r.cleaningRequestedAt,
                  dateAssigned: r.cleaningAssignedAt,
                  status:
                    r.cleaningStatus === "assigned" ? "Assigned" : "Pending",
                }),
              );
              cleanersHistoryLeavers.forEach((r) =>
                allCleaning.push({
                  key: `clh-l-${r.id}`,
                  address: `${r.propertyAddress} | Room ${r.roomNumber}`,
                  source:
                    r.cleaningRequestSource === "maintenance"
                      ? "Maintenance"
                      : "Inspector",
                  dateAsked: r.cleaningRequestedAt,
                  dateAssigned: r.cleaningAssignedAt,
                  status: "Cleaned",
                }),
              );
              cleanersHistoryTransfers.forEach((r) =>
                allCleaning.push({
                  key: `clh-t-${r.id}`,
                  address: `${r.currentProperty} | Room ${r.currentRoomNumber}`,
                  source:
                    r.cleaningRequestSource === "maintenance"
                      ? "Maintenance"
                      : "Inspector",
                  dateAsked: r.cleaningRequestedAt,
                  dateAssigned: r.cleaningAssignedAt,
                  status: "Cleaned",
                }),
              );

              const pendingCount =
                cleanersPendingLeavers.length +
                cleanersPendingTransfers.length;
              const cleanedCount =
                cleanersHistoryLeavers.length +
                cleanersHistoryTransfers.length;

              return (
                <>
                  <div className="records-heading">
                    <h2>Cleaners</h2>
                    <p>
                      Cleaning jobs requested by the inspector or maintenance,
                      handled by Tenants Management.
                    </p>
                  </div>
                  <div className="manager-kpi-grid">
                    <article className="manager-kpi-card manager-kpi-card-pending">
                      <strong>Rooms needing cleaning</strong>
                      <span>
                        <KpiNumber value={pendingCount} />
                      </span>
                    </article>
                    <article className="manager-kpi-card manager-kpi-card-success">
                      <strong>Cleaned</strong>
                      <span>
                        <KpiNumber value={cleanedCount} />
                      </span>
                    </article>
                  </div>
                  <section className="manager-team-section">
                    <div className="manager-team-header">
                      <h3>Rooms</h3>
                      <small>
                        Each row shows whether the room is cleaned, when it was
                        asked, and when it was assigned.
                      </small>
                    </div>
                    {allCleaning.length === 0 ? (
                      <p className="empty-records">
                        No cleaning jobs tracked yet.
                      </p>
                    ) : (
                      <div className="manager-table-wrap">
                        <table className="manager-table">
                          <thead>
                            <tr>
                              <th>Address</th>
                              <th>Requested by</th>
                              <th>Date asked</th>
                              <th>Date assigned</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allCleaning.map((row) => (
                              <tr key={row.key}>
                                <td>{row.address}</td>
                                <td>{row.source}</td>
                                <td>
                                  {row.dateAsked
                                    ? formatDisplayDate(row.dateAsked)
                                    : "—"}
                                </td>
                                <td>
                                  {row.dateAssigned
                                    ? formatDisplayDate(row.dateAssigned)
                                    : "—"}
                                </td>
                                <td>
                                  <span className={pillClassForStatus(row.status)}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              );
            }

            return null;
          })()}
          </section>
        </div>
      ) : isManagerView && selectedModule === "Manager" && managerView === "users" ? (
        <div className="manager-shell">
          {managerSidebar}
          <section className="records-panel manager-main">
            <UsersAdmin currentUserId={currentProfile.id} />
          </section>
        </div>
      ) : eligibilityResult && isNewReferral ? (
        <section className="eligibility-screen">
          <div className={`eligibility-card ${eligibilityResult.status}`}>
            <span>
              {eligibilityResult.status === "follow-up"
                ? "Follow up"
                : eligibilityResult.status === "passed"
                  ? "Passed"
                  : "Failed"}
            </span>
            <h1>
              {eligibilityResult.title ??
                (eligibilityResult.status === "passed"
                  ? "Eligibility passed"
                  : eligibilityResult.status === "follow-up"
                    ? "Follow up required"
                    : "Referral failed")}
            </h1>
            {eligibilityResult.status === "passed" ? (
              <label className="field field-wide">
                <span>Pass on to the Referral Officer</span>
                <select
                  onChange={(event) =>
                    setPassedReferralOfficer(event.target.value)
                  }
                  required
                  value={passedReferralOfficer}
                >
                  <option value="">Select Referral Officer</option>
                  {referralOfficers.map((officer) => (
                    <option key={officer} value={officer}>
                      {officer}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                {eligibilityResult.message && <p>{eligibilityResult.message}</p>}
                {eligibilityResult.reasons.length > 0 && (
                  <ul>
                    {eligibilityResult.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <button
              className="submit-button"
              onClick={() => {
                if (eligibilityResult.status === "passed") {
                  void savePassedReferralOfficer().then(() => {
                    setSelectedReceptionAction(null);
                    resetReferralForm();
                  });
                  return;
                }
                setSelectedReceptionAction(null);
                resetReferralForm();
              }}
              disabled={
                eligibilityResult.status === "passed" && !passedReferralOfficer
              }
              type="button"
            >
              {eligibilityResult.status === "passed"
                ? "Send to Referral Officer"
                : "Go home"}
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

        {!selectedModule && currentProfile.role !== "Manager" ? null : !selectedModule ? (
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
                    resetInspectionSummary();
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
              {(() => {
                const selectedIncoming = driverQueue.find(
                  (record) => record.id === selectedIncomingReferralId,
                );

                return driverQueue.length === 0 ? (
                  <p className="empty-records">No incoming referrals yet.</p>
                ) : (
                  <>
                    {selectedIncoming && (
                      <section className="history-detail">
                        <button
                          aria-label="Close details"
                          className="detail-close"
                          onClick={() =>
                            goBack(() => setSelectedIncomingReferralId(null))
                          }
                          type="button"
                        >
                          ×
                        </button>
                        <div>
                          <span className="record-status driver">Details</span>
                          <h3>{selectedIncoming.fullName}</h3>
                        </div>
                        <p>
                          Phone: {selectedIncoming.phoneNumber || "Missing"} | Age:{" "}
                          {selectedIncoming.age || "Not set"} | Children &lt;10:{" "}
                          {selectedIncoming.familyMembersBelow10 || "0"}
                        </p>
                        <label className="field">
                          <span>
                            {selectedIncoming.rejectedPropertyCount > 0
                              ? "Another property"
                              : "Property taking them to"}
                          </span>
                          <input
                            onChange={(event) =>
                              updateDriverRecord(selectedIncoming.id, {
                                currentProperty: event.target.value,
                              })
                            }
                            placeholder="Enter property address/name"
                            type="text"
                            value={selectedIncoming.currentProperty}
                          />
                        </label>
                        <label className="field">
                          <span>Room number</span>
                          <input
                            onChange={(event) =>
                              updateDriverRecord(selectedIncoming.id, {
                                currentRoomNumber: event.target.value,
                              })
                            }
                            placeholder="Enter room number"
                            type="text"
                            value={selectedIncoming.currentRoomNumber}
                          />
                        </label>
                        {selectedIncoming.propertyAccepted ? (
                          <div className="signature-panel">
                            <div className="viewing-sd-list">
                              {VIEWING_SLOT_INDICES.map((slotIndex, viewingIndex) => {
                                const slot = SD_SLOTS[slotIndex];
                                const file =
                                  viewingSdFiles[selectedIncoming.id]?.[viewingIndex];
                                return (
                                  <label
                                    className={`sd-slot sd-slot-row${file ? " ready" : ""}`}
                                    key={slot.code}
                                  >
                                    {renderSdSlotLabel(slot)}
                                    <input
                                      accept={SD_ACCEPT}
                                      onChange={(event) => {
                                        const picked = event.target.files?.[0] ?? null;
                                        setViewingSdFiles((current) => {
                                          const slots =
                                            current[selectedIncoming.id] ??
                                            Array(VIEWING_SLOT_INDICES.length).fill(
                                              null,
                                            );
                                          const nextSlots = [...slots];
                                          nextSlots[viewingIndex] = picked;
                                          return {
                                            ...current,
                                            [selectedIncoming.id]: nextSlots,
                                          };
                                        });
                                      }}
                                      type="file"
                                    />
                                    <span className="sd-slot-status">
                                      {file ? file.name : "Required"}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            <button
                              className="submit-button compact-button"
                              disabled={VIEWING_SLOT_INDICES.some(
                                (_, viewingIndex) =>
                                  !viewingSdFiles[selectedIncoming.id]?.[viewingIndex],
                              )}
                              onClick={() =>
                                void moveDriverReferralToHistory(
                                  selectedIncoming,
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
                            {selectedIncoming.rejectedPropertyCount > 0 && (
                              <label className="field">
                                <span>Reason they did not like the property</span>
                                <textarea
                                  onChange={(event) =>
                                    updateDriverRecord(selectedIncoming.id, {
                                      rejectionReason: event.target.value,
                                    })
                                  }
                                  placeholder="Enter reason"
                                  rows={3}
                                  value={selectedIncoming.rejectionReason}
                                />
                              </label>
                            )}
                            <div className="driver-actions">
                              <button
                                className="submit-button compact-button"
                                disabled={
                                  !selectedIncoming.currentProperty.trim() ||
                                  !selectedIncoming.currentRoomNumber.trim()
                                }
                                onClick={() =>
                                  updateDriverRecord(selectedIncoming.id, {
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
                                  !selectedIncoming.currentProperty.trim() ||
                                  !selectedIncoming.currentRoomNumber.trim() ||
                                  (selectedIncoming.rejectedPropertyCount > 0 &&
                                    !selectedIncoming.rejectionReason.trim())
                                }
                                onClick={() => rejectDriverProperty(selectedIncoming)}
                                type="button"
                              >
                                {selectedIncoming.rejectedPropertyCount > 0
                                  ? "End viewing"
                                  : "Rejected property"}
                              </button>
                            </div>
                          </>
                        )}
                      </section>
                    )}
                    {driverQueue.map((record) => (
                      <button
                        className={`history-row queue-row${
                          record.id === selectedIncomingReferralId
                            ? " is-selected"
                            : ""
                        }`}
                        key={record.id}
                        onClick={() =>
                          goForward(() => setSelectedIncomingReferralId(record.id))
                        }
                        type="button"
                      >
                        <span className="record-status driver">Incoming</span>
                        <strong>{record.fullName}</strong>
                        <small>
                          {record.phoneNumber || "No phone"} | Age:{" "}
                          {record.age || "—"}
                        </small>
                      </button>
                    ))}
                  </>
                );
              })()}
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
                >
                  <RecordMediaGallery
                    items={getRecordMediaItems(selectedHistoryDetail)}
                    title="Attachments"
                  />
                </HistoryDetailPanel>
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
                    <RecordMediaGallery
                      items={getRecordMediaItems(selectedHistoryDetail)}
                      title="Attachments"
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
              {(() => {
                const baseOptions = processingOptions.filter((option) =>
                  selectedModule === "Maintenance Team"
                    ? option !== "New Referral"
                    : option !== "Pending Jobs",
                );
                const finalOptions =
                  selectedModule === "Tenants Management"
                    ? [...baseOptions, "Cleaners"]
                    : baseOptions;
                return finalOptions.map((option, index) => {
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
                });
              })()}
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
                    <div className="referral-detail-header">
                      {(selectedModule === "HB Claims Team" ||
                        selectedModule === "RMS Team") && (
                        <p className="referral-officer-label">
                          <span className="referral-officer-label-key">
                            *Referral Officer Name:*
                          </span>{" "}
                          {selectedHistoryDetail.referralOfficer || "Not recorded"}
                        </p>
                      )}
                      <div>
                        <span className="record-status driver">Details</span>
                        <h3>{selectedHistoryDetail.fullName}</h3>
                      </div>
                    </div>

                    <label className="field field-wide">
                      <textarea
                        readOnly
                        rows={8}
                        value={formatReferralSummary(selectedHistoryDetail)}
                      />
                    </label>

                    {(selectedModule === "HB Claims Team" ||
                      selectedModule === "RMS Team") && (
                      <div className="attachments-toolbar">
                        <button
                          className="secondary-button compact-session-button"
                          disabled={documentsDownloading}
                          onClick={() => {
                            const items = buildReferralDownloadItems(
                              selectedHistoryDetail,
                            );
                            if (items.length === 0) {
                              toast.error("No documents to download.");
                              return;
                            }
                            setDocumentsDownloading(true);
                            void downloadReferralDocumentsZip(
                              items,
                              buildReferralZipFolderName(
                                selectedHistoryDetail.fullName,
                                selectedHistoryDetail.currentRoomNumber,
                                selectedHistoryDetail.currentProperty,
                              ),
                            )
                              .catch((error) => {
                                toast.error("Could not download documents", {
                                  description:
                                    error instanceof Error
                                      ? error.message
                                      : String(error),
                                });
                              })
                              .finally(() => setDocumentsDownloading(false));
                          }}
                          type="button"
                        >
                          {documentsDownloading
                            ? "Preparing zip…"
                            : "Download all documents"}
                        </button>
                      </div>
                    )}

                    <RecordMediaGallery
                      emptyLabel="No attachments uploaded at reception or by driver."
                      items={getRecordMediaItems(
                        selectedHistoryDetail,
                        selectedModule,
                      )}
                      title="Attachments"
                    />

                    {selectedModule === "Referral Officer" && (() => {
                      const savedPaths =
                        selectedHistoryDetail.sdDocumentPaths ?? [];
                      const picked =
                        sdDocumentFiles[selectedHistoryDetail.id] ?? [];
                      const filledCount = BACK_FILLING_SLOT_INDICES.reduce(
                        (count, slotIndex) =>
                          count +
                          (picked[slotIndex] || savedPaths[slotIndex] ? 1 : 0),
                        0,
                      );
                      return (
                        <section className="sd-documents-block">
                          <div className="sd-documents-header">
                            <h4>Supporting documents</h4>
                            <small>
                              All {BACK_FILLING_SLOT_INDICES.length} are
                              required before back filling can be completed.
                              {" "}
                              {filledCount}/{BACK_FILLING_SLOT_INDICES.length}
                              {" "}ready.
                            </small>
                          </div>
                          <div className="sd-documents-list">
                            {BACK_FILLING_SLOT_INDICES.map((slotIndex) => {
                              const slot = SD_SLOTS[slotIndex];
                              const savedPath = savedPaths[slotIndex];
                              const pickedFile = picked[slotIndex];
                              const isReady = Boolean(pickedFile || savedPath);
                              return (
                                <label
                                  className={`sd-slot${isReady ? " ready" : ""}`}
                                  key={slot.code}
                                >
                                  {renderSdSlotLabel(slot)}
                                  <input
                                    accept={SD_ACCEPT}
                                    onChange={(event) => {
                                      const file =
                                        event.target.files?.[0] ?? null;
                                      setSdDocumentFiles((prev) => {
                                        const current = prev[
                                          selectedHistoryDetail.id
                                        ] ?? Array(SD_SLOT_COUNT).fill(null);
                                        const next = [...current];
                                        next[slotIndex] = file;
                                        return {
                                          ...prev,
                                          [selectedHistoryDetail.id]: next,
                                        };
                                      });
                                    }}
                                    type="file"
                                  />
                                  <span className="sd-slot-status">
                                    {pickedFile
                                      ? pickedFile.name
                                      : savedPath
                                        ? "Uploaded"
                                        : "Required"}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })()}

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

                    {(() => {
                      const isRO = selectedModule === "Referral Officer";
                      const savedPaths =
                        selectedHistoryDetail.sdDocumentPaths ?? [];
                      const picked =
                        sdDocumentFiles[selectedHistoryDetail.id] ?? [];
                      const allSdReady = BACK_FILLING_SLOT_INDICES.every(
                        (slotIndex) =>
                          picked[slotIndex] || savedPaths[slotIndex],
                      );
                      const isSdUploading =
                        sdUploading[selectedHistoryDetail.id] ?? false;
                      const uploadedDisabled =
                        isRO && (!allSdReady || isSdUploading);
                      return (
                    <div className="driver-actions">
                      <button
                        className="submit-button compact-button"
                        disabled={uploadedDisabled}
                        onClick={() =>
                          void completeTeamReferral(
                            selectedModule ?? "",
                            selectedHistoryDetail,
                            "uploaded",
                          )
                        }
                        type="button"
                      >
                        {isRO && isSdUploading ? "Uploading..." : "Uploaded"}
                      </button>
                      <button
                        className="secondary-button dark-secondary-button"
                        disabled={
                          !teamRejectionReasons[
                            `${selectedModule}-${selectedHistoryDetail.id}`
                          ]?.trim()
                        }
                        onClick={() =>
                          void completeTeamReferral(
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
                          void completeTeamReferral(
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
                      );
                    })()}
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
                    <RecordMediaGallery
                      items={getRecordMediaItems(selectedHistoryDetail)}
                      title="Attachments"
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
                        disabled={
                          !evidence.hasPhotos ||
                          !evidence.hasVideos ||
                          maintenanceUploading[evidenceKey] ||
                          maintenanceNeedsCleaning[evidenceKey] === undefined ||
                          maintenanceNeedsCleaning[evidenceKey] === null
                        }
                        onClick={() =>
                          void completeMaintenancePendingJob(record, "leaver")
                        }
                        type="button"
                      >
                        {maintenanceUploading[evidenceKey]
                          ? "Uploading…"
                          : "Job done"}
                      </button>
                      <fieldset className="cleaning-handoff">
                        <legend>Does this site need cleaning afterwards?</legend>
                        <label className="yes-no-option">
                          <input
                            checked={
                              maintenanceNeedsCleaning[evidenceKey] === true
                            }
                            name={`needs-cleaning-leaver-${record.id}`}
                            onChange={() =>
                              setMaintenanceNeedsCleaning((current) => ({
                                ...current,
                                [evidenceKey]: true,
                              }))
                            }
                            type="radio"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="yes-no-option">
                          <input
                            checked={
                              maintenanceNeedsCleaning[evidenceKey] === false
                            }
                            name={`needs-cleaning-leaver-${record.id}`}
                            onChange={() =>
                              setMaintenanceNeedsCleaning((current) => ({
                                ...current,
                                [evidenceKey]: false,
                              }))
                            }
                            type="radio"
                          />
                          <span>No</span>
                        </label>
                      </fieldset>
                      <div className="form-grid">
                        <label className="field file-field">
                          <span>Attach completion photos *</span>
                          <input
                            accept="image/*"
                            capture="environment"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(
                                event.target.files ?? [],
                              );
                              setMaintenanceFiles(
                                "leaver",
                                record.id,
                                "photos",
                                files,
                              );
                            }}
                            type="file"
                          />
                          {(maintenanceCompletionFiles[evidenceKey]?.photos
                            ?.length ?? 0) > 0 && (
                            <small>
                              {
                                maintenanceCompletionFiles[evidenceKey].photos
                                  .length
                              }{" "}
                              photo(s) selected
                            </small>
                          )}
                        </label>
                        <label className="field file-field">
                          <span>Attach completion videos *</span>
                          <input
                            accept="video/*"
                            capture="environment"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(
                                event.target.files ?? [],
                              );
                              setMaintenanceFiles(
                                "leaver",
                                record.id,
                                "videos",
                                files,
                              );
                            }}
                            type="file"
                          />
                          {(maintenanceCompletionFiles[evidenceKey]?.videos
                            ?.length ?? 0) > 0 && (
                            <small>
                              {
                                maintenanceCompletionFiles[evidenceKey].videos
                                  .length
                              }{" "}
                              video(s) selected
                            </small>
                          )}
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
                        disabled={
                          !evidence.hasPhotos ||
                          !evidence.hasVideos ||
                          maintenanceUploading[evidenceKey] ||
                          maintenanceNeedsCleaning[evidenceKey] === undefined ||
                          maintenanceNeedsCleaning[evidenceKey] === null
                        }
                        onClick={() =>
                          void completeMaintenancePendingJob(record, "transfer")
                        }
                        type="button"
                      >
                        {maintenanceUploading[evidenceKey]
                          ? "Uploading…"
                          : "Job done"}
                      </button>
                      <fieldset className="cleaning-handoff">
                        <legend>Does this site need cleaning afterwards?</legend>
                        <label className="yes-no-option">
                          <input
                            checked={
                              maintenanceNeedsCleaning[evidenceKey] === true
                            }
                            name={`needs-cleaning-transfer-${record.id}`}
                            onChange={() =>
                              setMaintenanceNeedsCleaning((current) => ({
                                ...current,
                                [evidenceKey]: true,
                              }))
                            }
                            type="radio"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="yes-no-option">
                          <input
                            checked={
                              maintenanceNeedsCleaning[evidenceKey] === false
                            }
                            name={`needs-cleaning-transfer-${record.id}`}
                            onChange={() =>
                              setMaintenanceNeedsCleaning((current) => ({
                                ...current,
                                [evidenceKey]: false,
                              }))
                            }
                            type="radio"
                          />
                          <span>No</span>
                        </label>
                      </fieldset>
                      <div className="form-grid">
                        <label className="field file-field">
                          <span>Attach completion photos *</span>
                          <input
                            accept="image/*"
                            capture="environment"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(
                                event.target.files ?? [],
                              );
                              setMaintenanceFiles(
                                "transfer",
                                record.id,
                                "photos",
                                files,
                              );
                            }}
                            type="file"
                          />
                          {(maintenanceCompletionFiles[evidenceKey]?.photos
                            ?.length ?? 0) > 0 && (
                            <small>
                              {
                                maintenanceCompletionFiles[evidenceKey].photos
                                  .length
                              }{" "}
                              photo(s) selected
                            </small>
                          )}
                        </label>
                        <label className="field file-field">
                          <span>Attach completion videos *</span>
                          <input
                            accept="video/*"
                            capture="environment"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(
                                event.target.files ?? [],
                              );
                              setMaintenanceFiles(
                                "transfer",
                                record.id,
                                "videos",
                                files,
                              );
                            }}
                            type="file"
                          />
                          {(maintenanceCompletionFiles[evidenceKey]?.videos
                            ?.length ?? 0) > 0 && (
                            <small>
                              {
                                maintenanceCompletionFiles[evidenceKey].videos
                                  .length
                              }{" "}
                              video(s) selected
                            </small>
                          )}
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
        ) : isProcessingModule &&
          selectedModule === "Tenants Management" &&
          selectedProcessingAction === "Cleaners" ? (
          <section className="records-panel">
            <button
              className="back-button"
              onClick={() => setSelectedProcessingAction(null)}
              type="button"
            >
              Back to {selectedModule} options
            </button>
            <div className="records-heading">
              <h2>Cleaners</h2>
              <p>
                Cleaning jobs requested by the inspector or the maintenance
                team. Upload photos and a video when each room is done.
              </p>
            </div>
            <div className="manager-kpi-grid">
              <article className="manager-kpi-card">
                <strong>Pending cleaning</strong>
                <span>
                  <KpiNumber
                    value={
                      cleanersPendingLeavers.length +
                      cleanersPendingTransfers.length
                    }
                  />
                </span>
              </article>
              <article className="manager-kpi-card">
                <strong>Cleaned</strong>
                <span>
                  <KpiNumber
                    value={
                      cleanersHistoryLeavers.length +
                      cleanersHistoryTransfers.length
                    }
                  />
                </span>
              </article>
            </div>
            <div className="records-list">
              <h3 className="cleaners-subheading">Pending jobs</h3>
              {cleanersPendingLeavers.length === 0 &&
              cleanersPendingTransfers.length === 0 ? (
                <p className="empty-records">No cleaning jobs right now.</p>
              ) : (
                <>
                  {cleanersPendingLeavers.map((record) => {
                    const key = getCleaningKey("leaver", record.id);
                    const evidence =
                      cleaningCompletionEvidence[key] ?? {
                        hasPhotos: false,
                        hasVideos: false,
                      };
                    return (
                      <article
                        className="record-card"
                        key={`cleaning-leaver-${record.id}`}
                      >
                        <div>
                          <span className="record-status driver">Leaver</span>
                          <h3>
                            {inspectionPropertyAddress(record)} | Room{" "}
                            {inspectionRoomNumber(record)}
                          </h3>
                          <small>
                            {record.name} · requested by{" "}
                            {record.cleaningRequestSource === "maintenance"
                              ? "Maintenance Team"
                              : "Inspector"}
                          </small>
                        </div>
                        {record.cleaningDescription && (
                          <p className="cleaners-description">
                            {record.cleaningDescription}
                          </p>
                        )}
                        <RecordMediaGallery
                          items={getRecordMediaItems(record)}
                          title="Brief from the requester"
                        />
                        <div className="form-grid">
                          <label className="field file-field">
                            <span>Attach completion photos *</span>
                            <input
                              accept="image/*"
                              capture="environment"
                              multiple
                              onChange={(event) => {
                                const files = Array.from(
                                  event.target.files ?? [],
                                );
                                setCleaningFiles(
                                  "leaver",
                                  record.id,
                                  "photos",
                                  files,
                                );
                              }}
                              type="file"
                            />
                            {(cleaningCompletionFiles[key]?.photos?.length ??
                              0) > 0 && (
                              <small>
                                {
                                  cleaningCompletionFiles[key].photos.length
                                }{" "}
                                photo(s) selected
                              </small>
                            )}
                          </label>
                          <label className="field file-field">
                            <span>Attach completion video *</span>
                            <input
                              accept="video/*"
                              capture="environment"
                              multiple
                              onChange={(event) => {
                                const files = Array.from(
                                  event.target.files ?? [],
                                );
                                setCleaningFiles(
                                  "leaver",
                                  record.id,
                                  "videos",
                                  files,
                                );
                              }}
                              type="file"
                            />
                            {(cleaningCompletionFiles[key]?.videos?.length ??
                              0) > 0 && (
                              <small>
                                {
                                  cleaningCompletionFiles[key].videos.length
                                }{" "}
                                video(s) selected
                              </small>
                            )}
                          </label>
                        </div>
                        <button
                          className="submit-button compact-button"
                          disabled={
                            !evidence.hasPhotos ||
                            !evidence.hasVideos ||
                            cleaningUploading[key]
                          }
                          onClick={() =>
                            void completeCleaningJob(record, "leaver")
                          }
                          type="button"
                        >
                          {cleaningUploading[key]
                            ? "Uploading…"
                            : "Cleaning done"}
                        </button>
                      </article>
                    );
                  })}
                  {cleanersPendingTransfers.map((record) => {
                    const key = getCleaningKey("transfer", record.id);
                    const evidence =
                      cleaningCompletionEvidence[key] ?? {
                        hasPhotos: false,
                        hasVideos: false,
                      };
                    return (
                      <article
                        className="record-card"
                        key={`cleaning-transfer-${record.id}`}
                      >
                        <div>
                          <span className="record-status driver">
                            Transfer
                          </span>
                          <h3>
                            {inspectionPropertyAddress(record)} | Room{" "}
                            {inspectionRoomNumber(record)}
                          </h3>
                          <small>
                            {record.name} · requested by{" "}
                            {record.cleaningRequestSource === "maintenance"
                              ? "Maintenance Team"
                              : "Inspector"}
                          </small>
                        </div>
                        {record.cleaningDescription && (
                          <p className="cleaners-description">
                            {record.cleaningDescription}
                          </p>
                        )}
                        <RecordMediaGallery
                          items={getRecordMediaItems(record)}
                          title="Brief from the requester"
                        />
                        <div className="form-grid">
                          <label className="field file-field">
                            <span>Attach completion photos *</span>
                            <input
                              accept="image/*"
                              capture="environment"
                              multiple
                              onChange={(event) => {
                                const files = Array.from(
                                  event.target.files ?? [],
                                );
                                setCleaningFiles(
                                  "transfer",
                                  record.id,
                                  "photos",
                                  files,
                                );
                              }}
                              type="file"
                            />
                            {(cleaningCompletionFiles[key]?.photos?.length ??
                              0) > 0 && (
                              <small>
                                {
                                  cleaningCompletionFiles[key].photos.length
                                }{" "}
                                photo(s) selected
                              </small>
                            )}
                          </label>
                          <label className="field file-field">
                            <span>Attach completion video *</span>
                            <input
                              accept="video/*"
                              capture="environment"
                              multiple
                              onChange={(event) => {
                                const files = Array.from(
                                  event.target.files ?? [],
                                );
                                setCleaningFiles(
                                  "transfer",
                                  record.id,
                                  "videos",
                                  files,
                                );
                              }}
                              type="file"
                            />
                            {(cleaningCompletionFiles[key]?.videos?.length ??
                              0) > 0 && (
                              <small>
                                {
                                  cleaningCompletionFiles[key].videos.length
                                }{" "}
                                video(s) selected
                              </small>
                            )}
                          </label>
                        </div>
                        <button
                          className="submit-button compact-button"
                          disabled={
                            !evidence.hasPhotos ||
                            !evidence.hasVideos ||
                            cleaningUploading[key]
                          }
                          onClick={() =>
                            void completeCleaningJob(record, "transfer")
                          }
                          type="button"
                        >
                          {cleaningUploading[key]
                            ? "Uploading…"
                            : "Cleaning done"}
                        </button>
                      </article>
                    );
                  })}
                </>
              )}
              <h3 className="cleaners-subheading">Cleaned history</h3>
              {cleanersHistoryLeavers.length === 0 &&
              cleanersHistoryTransfers.length === 0 ? (
                <p className="empty-records">Nothing cleaned yet.</p>
              ) : (
                <ul className="cleaners-history" role="list">
                  {[...cleanersHistoryLeavers, ...cleanersHistoryTransfers]
                    .sort((a, b) => {
                      const aTime =
                        a.cleaningCompletedAt?.getTime() ??
                        a.createdAt.getTime();
                      const bTime =
                        b.cleaningCompletedAt?.getTime() ??
                        b.createdAt.getTime();
                      return bTime - aTime;
                    })
                    .map((record) => {
                      const key = `cleaning-history-${record.id}`;
                      return (
                        <li className="history-row" key={key}>
                          <strong>{inspectionPropertyAddress(record)}</strong>
                          <small>
                            Room {inspectionRoomNumber(record)} ·{" "}
                            {record.cleaningRequestSource === "maintenance"
                              ? "from Maintenance"
                              : "from Inspector"}
                            {record.cleaningCompletedAt
                              ? ` · ${formatDisplayDate(record.cleaningCompletedAt)}`
                              : ""}
                          </small>
                        </li>
                      );
                    })}
                </ul>
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
                    {!(
                      selectedModule === "Maintenance Team" &&
                      "currentProperty" in selectedHistoryDetail
                    ) && (
                      <RecordMediaGallery
                        items={getRecordMediaItems(
                          selectedHistoryDetail,
                          selectedModule,
                        )}
                        title="Attachments"
                      />
                    )}
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
                          <button
                            className="secondary-button dark-secondary-button"
                            onClick={() => {
                              void downloadInspectionDocumentsZip(
                                selectedHistoryDetail.inspectionReport,
                                `${selectedHistoryDetail.name}-Room(${selectedHistoryDetail.newRoomNumber})`,
                              ).catch((error) => {
                                toast.error("Could not download documents", {
                                  description:
                                    error instanceof Error
                                      ? error.message
                                      : String(error),
                                });
                              });
                            }}
                            type="button"
                          >
                            Download all documents
                          </button>
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
                                {(problem.photoPaths?.length ||
                                  problem.videoPaths?.length) && (
                                  <RecordMediaGallery
                                    items={[
                                      ...(problem.photoPaths ?? []).map(
                                        (path, i) => ({
                                          bucket: "maintenance-media" as const,
                                          path,
                                          kind: "photo" as const,
                                          label: `Photo ${i + 1}`,
                                        }),
                                      ),
                                      ...(problem.videoPaths ?? []).map(
                                        (path, i) => ({
                                          bucket: "maintenance-media" as const,
                                          path,
                                          kind: "video" as const,
                                          label: `Video ${i + 1}`,
                                        }),
                                      ),
                                    ]}
                                  />
                                )}
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
                      onClick={() => {
                        if (
                          !selectedModule ||
                          !("currentProperty" in selectedHistoryDetail)
                        ) {
                          setSelectedHistoryDetail(null);
                          return;
                        }
                        if (selectedModule === "Maintenance Team") {
                          void markTeamTransferUpdated(
                            selectedModule,
                            selectedHistoryDetail,
                          );
                          return;
                        }
                        if (
                          selectedModule === "Tenants Management" ||
                          selectedModule === "HB Claims Team" ||
                          selectedModule === "RMS Team"
                        ) {
                          void completeTeamTransfer(
                            selectedModule,
                            selectedHistoryDetail,
                            "uploaded",
                          );
                        }
                      }}
                      type="button"
                    >
                      {selectedModule === "Maintenance Team"
                        ? "Assigned"
                        : selectedModule === "Tenants Management" ||
                            selectedModule === "HB Claims Team" ||
                            selectedModule === "RMS Team"
                          ? "Uploaded"
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
                  {!(
                    selectedModule === "Maintenance Team" &&
                    "propertyAddress" in selectedHistoryDetail
                  ) && (
                    <RecordMediaGallery
                      items={getRecordMediaItems(
                        selectedHistoryDetail,
                        selectedModule,
                      )}
                      title="Attachments"
                    />
                  )}
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
                        <button
                          className="secondary-button dark-secondary-button"
                          onClick={() => {
                            void downloadInspectionDocumentsZip(
                              selectedHistoryDetail.inspectionReport,
                              `${selectedHistoryDetail.name}-Room(${selectedHistoryDetail.roomNumber})`,
                            ).catch((error) => {
                              toast.error("Could not download documents", {
                                description:
                                  error instanceof Error
                                    ? error.message
                                    : String(error),
                              });
                            });
                          }}
                          type="button"
                        >
                          Download all documents
                        </button>
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
                              {(problem.photoPaths?.length ||
                                problem.videoPaths?.length) && (
                                <RecordMediaGallery
                                  items={[
                                    ...(problem.photoPaths ?? []).map(
                                      (path, i) => ({
                                        bucket: "maintenance-media" as const,
                                        path,
                                        kind: "photo" as const,
                                        label: `Photo ${i + 1}`,
                                      }),
                                    ),
                                    ...(problem.videoPaths ?? []).map(
                                      (path, i) => ({
                                        bucket: "maintenance-media" as const,
                                        path,
                                        kind: "video" as const,
                                        label: `Video ${i + 1}`,
                                      }),
                                    ),
                                  ]}
                                />
                              )}
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
                    onClick={() => {
                      if (
                        !selectedModule ||
                        !("propertyAddress" in selectedHistoryDetail)
                      ) {
                        setSelectedHistoryDetail(null);
                        return;
                      }
                      if (selectedModule === "Maintenance Team") {
                        void markTeamLeaverUpdated(
                          selectedModule,
                          selectedHistoryDetail,
                        );
                        return;
                      }
                      if (
                        selectedModule === "Tenants Management" ||
                        selectedModule === "HB Claims Team" ||
                        selectedModule === "RMS Team"
                      ) {
                        void completeTeamLeaver(
                          selectedModule,
                          selectedHistoryDetail,
                          "uploaded",
                        );
                      }
                    }}
                    disabled={
                      selectedModule === "Maintenance Team" &&
                      "propertyAddress" in selectedHistoryDetail &&
                      !leaverScheduleDates[
                        `${selectedModule}-${selectedHistoryDetail.id}`
                      ]?.assignedDate
                    }
                    type="button"
                  >
                    {selectedModule === "Maintenance Team"
                      ? "Assigned"
                      : selectedModule === "Tenants Management" ||
                          selectedModule === "HB Claims Team" ||
                          selectedModule === "RMS Team"
                        ? "Uploaded"
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
          <div className="manager-shell">
            {managerSidebar}
            <section className="records-panel manager-main">
            <div className="records-heading">
              <h2>Dashboard</h2>
              <p>
                One command view for incoming referrals, team progress, reasons,
                and assignments.
              </p>
            </div>
            <div className="records-list">
              <div className="manager-kpi-grid">
                <article className="manager-kpi-card manager-kpi-card-pending">
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
          </div>
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

                  <section className="form-section inspection-summary-block">
                    <div className="section-heading">
                      <div>
                        <h2>Maintenance required?</h2>
                        <p>
                          Decide whether this property needs the maintenance
                          team. If yes, describe the work and attach overall
                          photos / videos.
                        </p>
                      </div>
                    </div>
                    <div className="yes-no-row">
                      <label className="yes-no-option">
                        <input
                          checked={inspectionMaintenanceRequested === true}
                          name="inspection-maintenance"
                          onChange={() => {
                            setInspectionMaintenanceRequested(true);
                            if (inspectionMaintenanceDraft.length === 0) {
                              addInspectionMaintenanceItem();
                            }
                          }}
                          type="radio"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="yes-no-option">
                        <input
                          checked={inspectionMaintenanceRequested === false}
                          name="inspection-maintenance"
                          onChange={() => {
                            setInspectionMaintenanceRequested(false);
                            setInspectionMaintenanceDraft([]);
                          }}
                          type="radio"
                        />
                        <span>No</span>
                      </label>
                    </div>
                    {inspectionMaintenanceRequested === true &&
                      inspectionMaintenanceDraft.map((problem, index) => {
                        const fileKey = inspectionItemKey("maintenance", problem.id);
                        return (
                          <article className="record-card" key={`maintenance-${problem.id}`}>
                            <div>
                              <span className="record-status driver">
                                Item {index + 1}
                              </span>
                              {inspectionMaintenanceDraft.length > 1 && (
                                <button
                                  className="back-button"
                                  onClick={() =>
                                    removeInspectionMaintenanceItem(problem.id)
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
                                    updateInspectionMaintenanceItem(problem.id, {
                                      description: event.target.value,
                                    })
                                  }
                                  placeholder="Describe the maintenance work needed"
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
                                    const incoming = Array.from(
                                      event.target.files ?? [],
                                    );
                                    if (incoming.length > 0) {
                                      appendInspectionItemFiles(
                                        fileKey,
                                        "photos",
                                        incoming,
                                      );
                                      updateInspectionMaintenanceItem(problem.id, {
                                        photoCount:
                                          problem.photoCount + incoming.length,
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
                                    const incoming = Array.from(
                                      event.target.files ?? [],
                                    );
                                    if (incoming.length > 0) {
                                      appendInspectionItemFiles(
                                        fileKey,
                                        "videos",
                                        incoming,
                                      );
                                      updateInspectionMaintenanceItem(problem.id, {
                                        videoCount:
                                          problem.videoCount + incoming.length,
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
                        );
                      })}

                    {inspectionMaintenanceRequested === true && (
                      <div className="inspection-add-row">
                        <button
                          aria-label="Add another maintenance item"
                          className="add-problem-button"
                          onClick={addInspectionMaintenanceItem}
                          title="Add another item"
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
                    )}
</section>

                  <section className="form-section inspection-summary-block">
                    <div className="section-heading">
                      <div>
                        <h2>Cleaning required?</h2>
                        <p>
                          Decide whether this property needs cleaning. If yes,
                          describe what's needed and attach photos / videos.
                          Cleaning jobs go to Tenants Management.
                        </p>
                      </div>
                    </div>
                    <div className="yes-no-row">
                      <label className="yes-no-option">
                        <input
                          checked={inspectionCleaningRequested === true}
                          name="inspection-cleaning"
                          onChange={() => {
                            setInspectionCleaningRequested(true);
                            if (inspectionCleaningDraft.length === 0) {
                              addInspectionCleaningItem();
                            }
                          }}
                          type="radio"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="yes-no-option">
                        <input
                          checked={inspectionCleaningRequested === false}
                          name="inspection-cleaning"
                          onChange={() => {
                            setInspectionCleaningRequested(false);
                            setInspectionCleaningDraft([]);
                          }}
                          type="radio"
                        />
                        <span>No</span>
                      </label>
                    </div>
                    {inspectionCleaningRequested === true &&
                      inspectionCleaningDraft.map((problem, index) => {
                        const fileKey = inspectionItemKey("cleaning", problem.id);
                        return (
                          <article className="record-card" key={`cleaning-${problem.id}`}>
                            <div>
                              <span className="record-status driver">
                                Item {index + 1}
                              </span>
                              {inspectionCleaningDraft.length > 1 && (
                                <button
                                  className="back-button"
                                  onClick={() =>
                                    removeInspectionCleaningItem(problem.id)
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
                                    updateInspectionCleaningItem(problem.id, {
                                      description: event.target.value,
                                    })
                                  }
                                  placeholder="Describe the cleaning needed"
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
                                    const incoming = Array.from(
                                      event.target.files ?? [],
                                    );
                                    if (incoming.length > 0) {
                                      appendInspectionItemFiles(
                                        fileKey,
                                        "photos",
                                        incoming,
                                      );
                                      updateInspectionCleaningItem(problem.id, {
                                        photoCount:
                                          problem.photoCount + incoming.length,
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
                                    const incoming = Array.from(
                                      event.target.files ?? [],
                                    );
                                    if (incoming.length > 0) {
                                      appendInspectionItemFiles(
                                        fileKey,
                                        "videos",
                                        incoming,
                                      );
                                      updateInspectionCleaningItem(problem.id, {
                                        videoCount:
                                          problem.videoCount + incoming.length,
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
                        );
                      })}

                    {inspectionCleaningRequested === true && (
                      <div className="inspection-add-row">
                        <button
                          aria-label="Add another cleaning item"
                          className="add-problem-button"
                          onClick={addInspectionCleaningItem}
                          title="Add another item"
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
                    )}
<div className="inspection-actions">
                      <button
                        className="submit-button"
                        disabled={inspectionUploading || !isInspectionFormReady()}
                        onClick={() =>
                          void completeInspection(selectedInspectionTarget)
                        }
                        type="button"
                      >
                        {inspectionUploading
                          ? "Uploading…"
                          : "Complete inspection"}
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
                          {(problem.photoPaths?.length ||
                            problem.videoPaths?.length) && (
                            <RecordMediaGallery
                              items={[
                                ...(problem.photoPaths ?? []).map(
                                  (path, i) => ({
                                    bucket: "maintenance-media" as const,
                                    path,
                                    kind: "photo" as const,
                                    label: `Photo ${i + 1}`,
                                  }),
                                ),
                                ...(problem.videoPaths ?? []).map(
                                  (path, i) => ({
                                    bucket: "maintenance-media" as const,
                                    path,
                                    kind: "video" as const,
                                    label: `Video ${i + 1}`,
                                  }),
                                ),
                              ]}
                            />
                          )}
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
                  <RecordMediaGallery
                    items={getRecordMediaItems(selectedHistoryDetail)}
                    title="Attachments"
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
                    <span>Tenant Type *</span>
                    <select
                      onChange={(event) => {
                        setTenantType(event.target.value);
                        if (event.target.value !== "family") {
                          setFamilyMembersBelow10("");
                        }
                      }}
                      required
                      value={tenantType}
                    >
                      <option value="" disabled>
                        Choose tenant type
                      </option>
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
                    <span>SD-10.1 Tenant ID *</span>
                    <input
                      accept="image/*"
                      capture="environment"
                      onChange={(event) =>
                        setIdPhotoFile(event.target.files?.[0] ?? null)
                      }
                      required
                      type="file"
                    />
                    <small>
                      {idPhotoFile
                        ? `Selected: ${idPhotoFile.name}`
                        : "Use the camera to take a photo of the tenant ID."}
                    </small>
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
                      onChange={(event) =>
                        setProofOfIncomeFile(event.target.files?.[0] ?? null)
                      }
                      type="file"
                    />
                    {proofOfIncomeFile && (
                      <small>Selected: {proofOfIncomeFile.name}</small>
                    )}
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
                  disabled={intakeUploading}
                  onClick={() => setReferralStep((currentStep) => currentStep - 1)}
                  type="button"
                >
                  Back
                </button>
              )}
              <button
                className="submit-button"
                disabled={intakeUploading}
                type="submit"
              >
                {intakeUploading
                  ? "Uploading documents…"
                  : referralStep === totalReferralSteps
                    ? "Save reception intake"
                    : "Next"}
              </button>
            </div>
          </form>
        )}
      </section>
      )}
    </main>
  );
}
