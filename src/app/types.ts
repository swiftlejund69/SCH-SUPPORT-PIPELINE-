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
  familyMembersBelow10: string;
  referralType: string;
  referralOfficer: string;
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
};

export type InspectionReport = {
  problems: InspectionProblem[];
  completedAt: Date;
  inspectorName?: string;
};

export type LeaverRecord = {
  id: number;
  mondayItemId?: string;
  supportOfficerName?: string;
  name: string;
  niNumber: string;
  propertyAddress: string;
  roomNumber: string;
  leavingDate: string;
  cleaningType: "cleaning" | "maintenance" | "";
  maintenanceWorksRequired: string;
  hasMaintenancePhotos: boolean;
  hasMaintenanceVideos: boolean;
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
};

export type TransferRecord = {
  id: number;
  mondayItemId?: string;
  supportOfficerName?: string;
  name: string;
  niNumber: string;
  currentProperty: string;
  currentRoomNumber: string;
  transferDate: string;
  newPropertyAddress: string;
  newRoomNumber: string;
  cleaningType: "cleaning" | "maintenance" | "";
  oldRoomMaintenanceWork: string;
  hasMaintenancePhotos: boolean;
  hasMaintenanceVideos: boolean;
  assignedJobDate?: string;
  createdAt: Date;
  department?: string;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;
  escalationCount?: number;
  inspectionReport?: InspectionReport;
};
