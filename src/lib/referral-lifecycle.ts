import { REFERRAL_MONDAY_STATUS } from "./referral-lifecycle-constants";
export * from "./referral-lifecycle-constants";

type LifecycleInput = {
  referralOfficerStatus?: string | null;
  hbClaimsStatus?: string | null;
  rmsStatus?: string | null;
  tenantsManagementStatus?: string | null;
  timelineEnd?: string | null;
};

function isTeamStepDone(status: string | null | undefined) {
  return status === "done" || status === "assigned";
}

export function isReferralTrackerComplete(input: LifecycleInput) {
  return (
    isTeamStepDone(input.referralOfficerStatus) &&
    isTeamStepDone(input.hbClaimsStatus) &&
    isTeamStepDone(input.rmsStatus) &&
    isTeamStepDone(input.tenantsManagementStatus)
  );
}

export function isReferralTimelineOverdue(timelineEnd?: string | null) {
  if (!timelineEnd) {
    return false;
  }
  const end = new Date(`${timelineEnd}T23:59:59`);
  return !Number.isNaN(end.getTime()) && Date.now() > end.getTime();
}

export function computeReferralMondayStatus(
  input: LifecycleInput,
): (typeof REFERRAL_MONDAY_STATUS)[keyof typeof REFERRAL_MONDAY_STATUS] {
  if (isReferralTrackerComplete(input)) {
    return REFERRAL_MONDAY_STATUS.completed;
  }
  if (isTeamStepDone(input.referralOfficerStatus)) {
    if (
      isReferralTimelineOverdue(input.timelineEnd) &&
      !isReferralTrackerComplete(input)
    ) {
      return REFERRAL_MONDAY_STATUS.delayed;
    }
    return REFERRAL_MONDAY_STATUS.inProgress;
  }
  return REFERRAL_MONDAY_STATUS.received;
}
