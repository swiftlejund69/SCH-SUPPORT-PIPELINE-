function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addWorkingDays(start: Date, workingDays: number) {
  const result = new Date(start);
  let added = 0;
  while (added < workingDays) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      added += 1;
    }
  }
  return result;
}

export function getReferralTimelineRange(workingDays = 2) {
  const from = new Date();
  const to = addWorkingDays(from, workingDays);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}
