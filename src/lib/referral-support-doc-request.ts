export type SupportDocRequest = {
  documentKey: string;
  documentLabel: string;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
};

const SUPPORT_DOC_REQUEST_PREFIX = "__support_doc_request__:";

export function stripSupportDocMetaFromHandoff(notes?: string | null) {
  if (!notes) {
    return "";
  }

  return notes
    .split("\n")
    .filter((line) => !line.startsWith(SUPPORT_DOC_REQUEST_PREFIX))
    .join("\n")
    .trim();
}

export function packSupportDocHandoffNotes(
  handoffNotes: string | undefined,
  request: SupportDocRequest,
) {
  const userNotes = stripSupportDocMetaFromHandoff(handoffNotes);
  const meta = JSON.stringify({
    documentKey: request.documentKey,
    documentLabel: request.documentLabel,
    reason: request.reason,
    requestedBy: request.requestedBy,
    requestedAt: request.requestedAt.toISOString(),
  });

  return `${SUPPORT_DOC_REQUEST_PREFIX}${meta}${userNotes ? `\n${userNotes}` : ""}`;
}

export function unpackSupportDocRequest(
  handoffNotes?: string | null,
): SupportDocRequest | undefined {
  if (!handoffNotes?.includes(SUPPORT_DOC_REQUEST_PREFIX)) {
    return undefined;
  }

  const metaLine = handoffNotes
    .split("\n")
    .find((line) => line.startsWith(SUPPORT_DOC_REQUEST_PREFIX));

  if (!metaLine) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(
      metaLine.slice(SUPPORT_DOC_REQUEST_PREFIX.length),
    ) as {
      documentKey?: string;
      documentLabel?: string;
      reason?: string;
      requestedBy?: string;
      requestedAt?: string;
    };

    if (!parsed.documentKey || !parsed.documentLabel || !parsed.requestedBy) {
      return undefined;
    }

    return {
      documentKey: parsed.documentKey,
      documentLabel: parsed.documentLabel,
      reason: parsed.reason ?? "",
      requestedBy: parsed.requestedBy,
      requestedAt: parsed.requestedAt
        ? new Date(parsed.requestedAt)
        : new Date(),
    };
  } catch {
    return undefined;
  }
}

export const TEAMS_THAT_RETURN_DOC_REQUESTS_TO_RO = [
  "HB Claims Team",
  "RMS Team",
] as const;

export function teamReturnsDocRequestToReferralOfficer(department: string) {
  return (TEAMS_THAT_RETURN_DOC_REQUESTS_TO_RO as readonly string[]).includes(
    department,
  );
}
