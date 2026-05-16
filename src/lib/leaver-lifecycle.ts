import { LEAVER_MONDAY_STATUS } from "./leaver-lifecycle-constants";
export * from "./leaver-lifecycle-constants";

export type LeaverLifecycleInput = {
  tenantsManagementStatus?: string | null;
  hbClaimsStatus?: string | null;
  rmsStatus?: string | null;
  maintenanceStatus?: string | null;
  propertyInspected?: boolean;
  /** When false, maintenance column is not required for Complete status */
  maintenanceRequired?: boolean;
};

function isTeamUploadDone(status: string | null | undefined) {
  return status === "done";
}

function isMaintenanceStepDone(input: LeaverLifecycleInput) {
  if (input.maintenanceRequired !== true) {
    return true;
  }
  return input.maintenanceStatus === "done";
}

/** Normalizes API/DB payloads before computing Monday Status. */
export function normalizeTrackerLifecycleInput(
  input: LeaverLifecycleInput,
): LeaverLifecycleInput {
  return {
    tenantsManagementStatus: input.tenantsManagementStatus ?? null,
    hbClaimsStatus: input.hbClaimsStatus ?? null,
    rmsStatus: input.rmsStatus ?? null,
    maintenanceStatus: input.maintenanceStatus ?? null,
    propertyInspected: input.propertyInspected === true,
    maintenanceRequired: input.maintenanceRequired === true,
  };
}

export function isLeaverTrackerComplete(input: LeaverLifecycleInput) {
  const normalized = normalizeTrackerLifecycleInput(input);
  return (
    isTeamUploadDone(normalized.tenantsManagementStatus) &&
    isTeamUploadDone(normalized.hbClaimsStatus) &&
    isTeamUploadDone(normalized.rmsStatus) &&
    normalized.propertyInspected === true &&
    isMaintenanceStepDone(normalized)
  );
}

export function computeLeaverMondayStatus(
  input: LeaverLifecycleInput,
): (typeof LEAVER_MONDAY_STATUS)[keyof typeof LEAVER_MONDAY_STATUS] {
  const normalized = normalizeTrackerLifecycleInput(input);
  if (isLeaverTrackerComplete(normalized)) {
    return LEAVER_MONDAY_STATUS.completed;
  }
  if (isTeamUploadDone(normalized.tenantsManagementStatus)) {
    return LEAVER_MONDAY_STATUS.inProgress;
  }
  return LEAVER_MONDAY_STATUS.referralReceived;
}
