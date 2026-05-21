export type EligibilityResult = {
  status: "passed" | "failed" | "follow-up";
  reasons: string[];
  title?: string;
  message?: string;
};

export type ReferralStatus =
  | "passed"
  | "failed"
  | "follow-up"
  | "driver"
  | "handed-off"
  | "secured"
  | "viewing-ended";

export type ReferralRecord = {
  id: number;
  mondayItemId?: string;
  fullName: string;
  age: string;
  dateOfBirth: string;
  niNumber: string;
  incomeAmount: string;
  phoneNumber: string;
  tenantType?: string;
  familyMembersBelow10: string;
  referralType: string;
  referralOfficer: string;
  handoffNotes?: string;
  timelineEnd?: string;
  mondayStatus?: string;
  referralOfficerStatus?: string | null;
  hbClaimsStatus?: string | null;
  rmsStatus?: string | null;
  tenantsManagementStatus?: string | null;
  driverAccepted: boolean;
  currentProperty: string;
  currentRoomNumber: string;
  propertyAccepted: boolean;
  rejectedPropertyCount: number;
  rejectionReason: string;
  status: ReferralStatus;
  reasons: string[];
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;
  escalationCount?: number;
  escalationPausedAt?: Date;
  supportWorker?: string;
  idPhotoPath?: string;
  proofOfIncomePath?: string;
  signaturePhotoPath?: string;
  sdDocumentPaths?: string[];
  createdAt: Date;
};

export type TeamReferralRecord = ReferralRecord & {
  department: string;
  teamOutcome?: "uploaded" | "awaiting-information" | "rejected";
  teamRejectionReason?: string;
  handledAt?: Date;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;
  escalationCount?: number;
  escalationPausedAt?: Date;
};

export type InspectionProblem = {
  id: number;
  description: string;
  photoCount: number;
  videoCount: number;
  photoPaths?: string[];
  videoPaths?: string[];
};

export type InspectionReport = {
  problems: InspectionProblem[];
  completedAt: Date;
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

export type CleaningStatus = "pending" | "assigned" | "completed";

export type CleaningRequestSource = "inspector" | "maintenance";

export type CleaningFields = {
  cleaningStatus?: CleaningStatus;
  cleaningRequestSource?: CleaningRequestSource;
  cleaningRequestedAt?: Date;
  cleaningAssignedAt?: Date;
  cleaningCompletedAt?: Date;
  cleaningDescription?: string;
  cleaningPhotoPaths?: string[];
  cleaningVideoPaths?: string[];
  cleaningCompletionPhotoPaths?: string[];
  cleaningCompletionVideoPaths?: string[];
};

export type LeaverRecord = {
  id: number;
  mondayItemId?: string;
  supportOfficerName?: string;
  name: string;
  niNumber: string;
  timelineEnd?: string;
  mondayStatus?: string;
  tenantsManagementStatus?: string | null;
  hbClaimsStatus?: string | null;
  rmsStatus?: string | null;
  maintenanceStatus?: string | null;
  propertyInspected?: boolean;
  maintenanceRequired?: boolean;
  inspectionCompletedAt?: string;
  propertyAddress: string;
  roomNumber: string;
  leavingDate: string;
  cleaningType: "cleaning" | "maintenance" | "";
  maintenanceWorksRequired: string;
  hasMaintenancePhotos: boolean;
  hasMaintenanceVideos: boolean;
  maintenancePhotoPaths?: string[];
  maintenanceVideoPaths?: string[];
  inspectionPhotoPaths?: string[];
  inspectionVideoPaths?: string[];
  assignedJobDate?: string;
  cleaningScheduledDate?: string;
  maintenanceScheduledDate?: string;
  createdAt: Date;
  department?: string;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;
  escalationCount?: number;
  inspectionReport?: InspectionReport;
} & CleaningFields;

export type TransferRecord = {
  id: number;
  mondayItemId?: string;
  supportOfficerName?: string;
  name: string;
  niNumber: string;
  mondayStatus?: string;
  tenantsManagementStatus?: string | null;
  hbClaimsStatus?: string | null;
  rmsStatus?: string | null;
  maintenanceStatus?: string | null;
  propertyInspected?: boolean;
  maintenanceRequired?: boolean;
  inspectionCompletedAt?: string;
  currentProperty: string;
  currentRoomNumber: string;
  transferDate: string;
  newPropertyAddress: string;
  newRoomNumber: string;
  cleaningType: "cleaning" | "maintenance" | "";
  oldRoomMaintenanceWork: string;
  hasMaintenancePhotos: boolean;
  hasMaintenanceVideos: boolean;
  maintenancePhotoPaths?: string[];
  maintenanceVideoPaths?: string[];
  inspectionPhotoPaths?: string[];
  inspectionVideoPaths?: string[];
  assignedJobDate?: string;
  cleaningScheduledDate?: string;
  createdAt: Date;
  department?: string;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;
  escalationCount?: number;
  inspectionReport?: InspectionReport;
} & CleaningFields;
