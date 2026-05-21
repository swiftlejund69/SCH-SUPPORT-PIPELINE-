const FOLLOW_UP_META_PREFIX = "__follow_up_meta__:";

export function stripFollowUpMetaFromHandoff(notes?: string | null) {
  if (!notes) {
    return "";
  }

  return notes.replace(new RegExp(`^${FOLLOW_UP_META_PREFIX}[^\\n]*\\n?`), "").trim();
}

export function packFollowUpHandoffNotes(
  handoffNotes: string | undefined,
  reasons: string[],
  tenantType: string,
) {
  const userNotes = stripFollowUpMetaFromHandoff(handoffNotes);
  if (reasons.length === 0 && !tenantType.trim()) {
    return userNotes || null;
  }

  const meta = JSON.stringify({ reasons, tenantType: tenantType.trim() });
  return `${FOLLOW_UP_META_PREFIX}${meta}${userNotes ? `\n${userNotes}` : ""}`;
}

export function unpackFollowUpFromHandoff(handoffNotes?: string | null) {
  if (!handoffNotes?.startsWith(FOLLOW_UP_META_PREFIX)) {
    return { reasons: [] as string[], tenantType: "" };
  }

  const metaLine = handoffNotes.split("\n")[0] ?? "";
  try {
    const parsed = JSON.parse(
      metaLine.slice(FOLLOW_UP_META_PREFIX.length),
    ) as { reasons?: string[]; tenantType?: string };
    return {
      reasons: parsed.reasons ?? [],
      tenantType: parsed.tenantType ?? "",
    };
  } catch {
    return { reasons: [], tenantType: "" };
  }
}

export function isMissingFollowUpColumnsError(error: {
  code?: string;
  message?: string;
}) {
  const message = error.message ?? "";
  return (
    error.code === "PGRST204" &&
    (message.includes("follow_up_reasons") || message.includes("tenant_type"))
  );
}
