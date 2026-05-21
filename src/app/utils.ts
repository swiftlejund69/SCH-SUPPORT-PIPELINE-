export type UkPhoneValidationResult =
  | { valid: true; normalized: string; display: string }
  | { valid: false; message: string };

/** Strip spaces/dashes and validate UK mobile or landline (0… or +44…). */
export function validateUkPhoneNumber(raw: string): UkPhoneValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, message: "Phone number is required." };
  }

  let digits = trimmed.replace(/[\s().-]/g, "");
  if (digits.startsWith("+44")) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.startsWith("0044")) {
    digits = `0${digits.slice(4)}`;
  } else if (digits.startsWith("44") && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  }

  digits = digits.replace(/\D/g, "");

  if (!digits.startsWith("0")) {
    return {
      valid: false,
      message: "Enter a valid UK number starting with 0 or +44.",
    };
  }

  const ukPatterns = [
    /^07\d{9}$/,
    /^01\d{8,9}$/,
    /^02\d{8,9}$/,
    /^03\d{8,9}$/,
    /^080\d{6,7}$/,
    /^084\d{7}$/,
  ];

  if (!ukPatterns.some((pattern) => pattern.test(digits))) {
    return {
      valid: false,
      message: "Enter a valid UK mobile or landline (e.g. 07XXX XXXXXX).",
    };
  }

  let display = digits;
  if (/^07\d{9}$/.test(digits)) {
    display = `${digits.slice(0, 5)} ${digits.slice(5)}`;
  } else if (digits.length === 11) {
    display = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  } else if (digits.length === 10) {
    display = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  return { valid: true, normalized: digits, display };
}

export function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) {
    return "";
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return Number.isNaN(age) ? "" : String(age);
}

export function getReminderDates(createdAt: Date) {
  return [2, 4].map((days) => {
    const reminderDate = new Date(createdAt);
    reminderDate.setDate(reminderDate.getDate() + days);
    return reminderDate;
  });
}

/** End of the last reminder day (day 4 after creation). */
export function getFollowUpDeadline(createdAt: Date) {
  const reminders = getReminderDates(createdAt);
  const deadline = new Date(reminders[reminders.length - 1] ?? createdAt);
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

export function isFollowUpDeadlinePassed(
  createdAt: Date,
  now: Date = new Date(),
) {
  return now.getTime() > getFollowUpDeadline(createdAt).getTime();
}

export type UkNiValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; message: string };

/** UK National Insurance number (e.g. QQ123456C). */
export function validateUkNiNumber(raw: string): UkNiValidationResult {
  const normalized = raw.replace(/\s+/g, "").toUpperCase();

  if (!normalized) {
    return { valid: false, message: "NI Number is required." };
  }

  if (!/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i.test(normalized)) {
    return {
      valid: false,
      message:
        "Enter a valid UK NI number (2 letters, 6 digits, 1 letter — e.g. QQ123456C).",
    };
  }

  const prefix = normalized.slice(0, 2);
  const invalidPrefixes = ["BG", "GB", "KN", "NK", "NT", "TN", "ZZ"];
  if (invalidPrefixes.includes(prefix)) {
    return {
      valid: false,
      message: "This prefix is not used for UK NI numbers.",
    };
  }

  return { valid: true, normalized };
}

export function isFollowUpDocumentsPending(record: {
  niNumber?: string;
  incomeAmount?: string;
  idPhotoPath?: string;
  proofOfIncomePath?: string;
}) {
  const hasNi = Boolean(record.niNumber?.trim());
  const hasIncome = Number(record.incomeAmount) > 0;
  const hasIdPhoto = Boolean(record.idPhotoPath);
  const hasProofFile = Boolean(record.proofOfIncomePath);

  return !hasNi || !hasIncome || !hasIdPhoto || !hasProofFile;
}

export function formatDisplayDate(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
  }

  const parsedDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return typeof value === "string" ? value : "";
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getInitials(label: string) {
  return label
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);
}
