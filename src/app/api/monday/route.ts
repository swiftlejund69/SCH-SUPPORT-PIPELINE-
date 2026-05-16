import { NextResponse } from "next/server";
import { getReferralTimelineRange } from "../../../lib/working-days";
import {
  LEAVER_MONDAY_STATUS,
  computeLeaverMondayStatus,
  normalizeTrackerLifecycleInput,
} from "../../../lib/leaver-lifecycle";
import {
  REFERRAL_MONDAY_STATUS,
  computeReferralMondayStatus,
} from "../../../lib/referral-lifecycle";


type MondayColumnValue =
  | string
  | number
  | null
  | {
      date?: string;
      label?: string;
      labels?: string[];
      text?: string;
      from?: string;
      to?: string;
    };

type ReferralPayload = {
  id: number;
  fullName: string;
  referralType: string;
  referralOfficer: string;
  currentProperty: string;
  currentRoomNumber: string;
};

type LeaverPayload = {
  id: number;
  name: string;
  supportOfficerName?: string;
  propertyAddress: string;
  roomNumber: string;
  leavingDate: string;
  cleaningType: string;
};

type TransferPayload = {
  id: number;
  name: string;
  supportOfficerName?: string;
  currentProperty: string;
  currentRoomNumber: string;
  transferDate: string;
  newPropertyAddress: string;
  newRoomNumber: string;
  cleaningType: string;
};

const mondayApiUrl = "https://api.monday.com/v2";
const activeReferralsGroupId = "group_mm2fjw96";

const boards = {
  referrals: 5094811821,
  leavers: 5095029487,
  transfers: 5095651822,
} as const;

const columns = {
  date: "date_mm2f91np",
  referralType: "color_mm2gwc7n",
  referralOfficer: "dropdown_mm2g9dtk",
  packCompleted: "color_mm2g6857",
  claimSubmitted: "color_mm2gnm6m",
  rmsCompleted: "color_mm2grxkg",
  /** Referral Tracker: Tenancy List Updated (formerly Property Live) */
  tenancyListUpdated: "color_mm2gd2j6",
  propertyLiveOrInspected: "color_mm2gd2j6",
  maintenanceCleaning: "color_mm2gwc7n",
  cleaningOrMaintenance: "dropdown_mm2t2sw2",
  timeline: "timerange_mm2gyzsm",
  propertyAddress: "text_mm2fsm35",
  notes: "long_text_mm2fr4f0",
  referralStatus: process.env.MONDAY_REFERRAL_STATUS_COLUMN_ID ?? "",
} as const;

type MondayColumnMeta = {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
};

type TrackerBoard = "leavers" | "transfers";

let cachedReferralBoardColumns: MondayColumnMeta[] | null = null;
let cachedLeaversBoardColumns: MondayColumnMeta[] | null = null;
let cachedTransfersBoardColumns: MondayColumnMeta[] | null = null;

let cachedReferralStatusColumnId: string | null =
  process.env.MONDAY_REFERRAL_STATUS_COLUMN_ID || null;
let cachedLeaverStatusColumnId: string | null =
  process.env.MONDAY_LEAVER_STATUS_COLUMN_ID || null;
let cachedTransferStatusColumnId: string | null =
  process.env.MONDAY_TRANSFER_STATUS_COLUMN_ID || null;

async function getReferralBoardColumns() {
  if (cachedReferralBoardColumns) {
    return cachedReferralBoardColumns;
  }

  const data = await mondayRequest<{
    boards: Array<{ columns: MondayColumnMeta[] }>;
  }>(
    `
      query ReferralBoardColumns($boardId: [ID!]) {
        boards(ids: $boardId) {
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `,
    { boardId: [boards.referrals] },
  );

  cachedReferralBoardColumns = data?.boards?.[0]?.columns ?? [];
  return cachedReferralBoardColumns;
}

async function resolveReferralColumnIdByTitles(...titles: string[]) {
  const columnsOnBoard = await getReferralBoardColumns();
  const normalizedTitles = titles.map((title) => title.trim().toLowerCase());

  const match = columnsOnBoard.find((column) =>
    normalizedTitles.includes(column.title.trim().toLowerCase()),
  );

  return match?.id ?? null;
}

async function getLeaversBoardColumns() {
  if (cachedLeaversBoardColumns) {
    return cachedLeaversBoardColumns;
  }

  const data = await mondayRequest<{
    boards: Array<{ columns: MondayColumnMeta[] }>;
  }>(
    `
      query LeaversBoardColumns($boardId: [ID!]) {
        boards(ids: $boardId) {
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `,
    { boardId: [boards.leavers] },
  );

  cachedLeaversBoardColumns = data?.boards?.[0]?.columns ?? [];
  return cachedLeaversBoardColumns;
}

async function resolveLeaverColumnIdByTitles(...titles: string[]) {
  const columnsOnBoard = await getLeaversBoardColumns();
  const normalizedTitles = titles.map((title) => title.trim().toLowerCase());

  const match = columnsOnBoard.find((column) =>
    normalizedTitles.includes(column.title.trim().toLowerCase()),
  );

  return match?.id ?? null;
}

async function getLeaverColumnMeta(columnId: string) {
  const columnsOnBoard = await getLeaversBoardColumns();
  return columnsOnBoard.find((column) => column.id === columnId);
}

async function resolveLeaverColorLabel(
  columnId: string,
  candidates: string[],
  fallback: string,
) {
  const columnMeta = await getLeaverColumnMeta(columnId);
  return pickColorLabelFromSettings(columnMeta?.settings_str, candidates, fallback);
}

async function getTransfersBoardColumns() {
  if (cachedTransfersBoardColumns) {
    return cachedTransfersBoardColumns;
  }

  const data = await mondayRequest<{
    boards: Array<{ columns: MondayColumnMeta[] }>;
  }>(
    `
      query TransfersBoardColumns($boardId: [ID!]) {
        boards(ids: $boardId) {
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `,
    { boardId: [boards.transfers] },
  );

  cachedTransfersBoardColumns = data?.boards?.[0]?.columns ?? [];
  return cachedTransfersBoardColumns;
}

async function resolveTransferColumnIdByTitles(...titles: string[]) {
  const columnsOnBoard = await getTransfersBoardColumns();
  const normalizedTitles = titles.map((title) => title.trim().toLowerCase());

  const match = columnsOnBoard.find((column) =>
    normalizedTitles.includes(column.title.trim().toLowerCase()),
  );

  return match?.id ?? null;
}

async function getTransferColumnMeta(columnId: string) {
  const columnsOnBoard = await getTransfersBoardColumns();
  return columnsOnBoard.find((column) => column.id === columnId);
}

async function resolveTransferColorLabel(
  columnId: string,
  candidates: string[],
  fallback: string,
) {
  const columnMeta = await getTransferColumnMeta(columnId);
  return pickColorLabelFromSettings(columnMeta?.settings_str, candidates, fallback);
}

async function resolveTrackerColumnIdByTitles(
  board: TrackerBoard,
  ...titles: string[]
) {
  return board === "leavers"
    ? resolveLeaverColumnIdByTitles(...titles)
    : resolveTransferColumnIdByTitles(...titles);
}

async function resolveTrackerColorLabel(
  board: TrackerBoard,
  columnId: string,
  candidates: string[],
  fallback: string,
) {
  return board === "leavers"
    ? resolveLeaverColorLabel(columnId, candidates, fallback)
    : resolveTransferColorLabel(columnId, candidates, fallback);
}

function pickColorLabelFromSettings(
  settingsStr: string | undefined,
  candidates: string[],
  fallback: string,
) {
  if (!settingsStr) {
    return fallback;
  }

  try {
    const settings = JSON.parse(settingsStr) as {
      labels?: Record<string, string>;
    };
    const labelValues = Object.values(settings.labels ?? {});

    for (const candidate of candidates) {
      const hit = labelValues.find(
        (value) => value.toLowerCase() === candidate.toLowerCase(),
      );
      if (hit) {
        return hit;
      }
    }
  } catch {
    // use fallback
  }

  return fallback;
}

async function resolveReferralStatusColumnId() {
  if (cachedReferralStatusColumnId) {
    return cachedReferralStatusColumnId;
  }

  const statusColumnId = await resolveReferralColumnIdByTitles("Status");

  if (!statusColumnId) {
    throw new Error("Could not find Referral Tracker Status column in Monday.");
  }

  cachedReferralStatusColumnId = statusColumnId;
  return statusColumnId;
}

async function getTenancyListUpdatedColumnValue(isDone: boolean) {
  const columnsOnBoard = await getReferralBoardColumns();
  const columnId =
    (await resolveReferralColumnIdByTitles(
      "Tenancy List Updated",
      "Property Live",
      "Property Live or Inspected",
    )) ?? columns.tenancyListUpdated;

  const columnMeta = columnsOnBoard.find((column) => column.id === columnId);

  const label = pickColorLabelFromSettings(
    columnMeta?.settings_str,
    isDone ? ["Yes", "YES", "yes"] : ["No", "NO", "no"],
    isDone ? "Yes" : "No",
  );

  return { columnId, label };
}


function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatRoomAddress(roomNumber: string, address: string) {
  const trimmedRoom = roomNumber.trim();
  const trimmedAddress = address.trim();

  return trimmedRoom ? `Room ${trimmedRoom}, ${trimmedAddress}` : trimmedAddress;
}

async function mondayRequest<T>(
  query: string,
  variables: Record<string, unknown>,
) {
  const token = process.env.MONDAY_API_TOKEN;

  if (!token) {
    throw new Error("Missing MONDAY_API_TOKEN.");
  }

  const response = await fetch(mondayApiUrl, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (!response.ok || result.errors?.length) {
    throw new Error(
      result.errors?.map((error) => error.message).join(", ") ||
        "Monday API request failed.",
    );
  }

  return result.data;
}

async function createMondayItem(
  boardId: number,
  itemName: string,
  columnValues: Record<string, MondayColumnValue>,
) {
  const data = await mondayRequest<{ create_item: { id: string } }>(
    `
      mutation CreateItem(
        $boardId: ID!
        $groupId: String!
        $itemName: String!
        $columnValues: JSON!
      ) {
        create_item(
          board_id: $boardId
          group_id: $groupId
          item_name: $itemName
          column_values: $columnValues
        ) {
          id
        }
      }
    `,
    {
      boardId,
      groupId: activeReferralsGroupId,
      itemName,
      columnValues: JSON.stringify(columnValues),
    },
  );

  return data?.create_item.id;
}

async function updateMondayItem(
  boardId: number,
  itemId: string,
  columnValues: Record<string, MondayColumnValue>,
) {
  await mondayRequest<{ change_multiple_column_values: { id: string } }>(
    `
      mutation UpdateItem(
        $boardId: ID!
        $itemId: ID!
        $columnValues: JSON!
      ) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $columnValues
        ) {
          id
        }
      }
    `,
    {
      boardId,
      itemId,
      columnValues: JSON.stringify(columnValues),
    },
  );
}

async function getReferralCreateColumns(record: ReferralPayload) {
  const statusColumnId = await resolveReferralStatusColumnId();
  const receivedLabel = await resolveReferralStatusLabel(
    REFERRAL_MONDAY_STATUS.received,
  );
  const timeline = getReferralTimelineRange(2);
  const columnValues: Record<string, MondayColumnValue> = {
    [columns.date]: { date: getTodayDate() },
    [columns.referralType]: {
      label: record.referralType === "sourced" ? "REFERRAL" : "WALK IN",
    },
    [columns.propertyAddress]: formatRoomAddress(
      record.currentRoomNumber,
      record.currentProperty,
    ),
    [statusColumnId]: { label: receivedLabel },
    [columns.timeline]: {
      from: timeline.from,
      to: timeline.to,
    },
  };

  if (record.referralOfficer?.trim()) {
    columnValues[columns.referralOfficer] = {
      labels: [record.referralOfficer.trim()],
    };
  }

  return { columnValues, timelineEnd: timeline.to };
}


async function resolveLeaverStatusColumnId() {
  if (cachedLeaverStatusColumnId) {
    return cachedLeaverStatusColumnId;
  }

  const statusColumnId =
    (await resolveLeaverColumnIdByTitles("Status")) ?? columns.referralStatus;

  if (!statusColumnId) {
    throw new Error("Could not find Leavers Tracker Status column in Monday.");
  }

  cachedLeaverStatusColumnId = statusColumnId;
  return statusColumnId;
}

async function resolveLeaverStatusLabel(
  internalStatus: (typeof LEAVER_MONDAY_STATUS)[keyof typeof LEAVER_MONDAY_STATUS],
) {
  const statusColumnId = await resolveLeaverStatusColumnId();
  const columnsOnBoard = await getLeaversBoardColumns();
  const columnMeta = columnsOnBoard.find((column) => column.id === statusColumnId);

  const candidatesByStatus: Record<string, string[]> = {
    [LEAVER_MONDAY_STATUS.referralReceived]: ["Referral Received"],
    [LEAVER_MONDAY_STATUS.inProgress]: ["In Progress", "In progress"],
    [LEAVER_MONDAY_STATUS.completed]: ["Complete", "Completed"],
  };

  return pickColorLabelFromSettings(
    columnMeta?.settings_str,
    candidatesByStatus[internalStatus] ?? [internalStatus],
    internalStatus,
  );
}

type LeaverLifecyclePayload = {
  itemId: string;
  tenantsManagementStatus?: string | null;
  hbClaimsStatus?: string | null;
  rmsStatus?: string | null;
  maintenanceStatus?: string | null;
  propertyInspected?: boolean;
  maintenanceRequired?: boolean;
};

type TrackerLifecyclePayload = LeaverLifecyclePayload;

async function getTrackerLifecycleColumnValues(
  board: TrackerBoard,
  payload: TrackerLifecyclePayload,
) {
  const statusColumnId =
    board === "leavers"
      ? await resolveLeaverStatusColumnId()
      : await resolveTransferStatusColumnId();
  const nextStatus = computeLeaverMondayStatus(
    normalizeTrackerLifecycleInput({
      tenantsManagementStatus: payload.tenantsManagementStatus,
      hbClaimsStatus: payload.hbClaimsStatus,
      rmsStatus: payload.rmsStatus,
      maintenanceStatus: payload.maintenanceStatus,
      propertyInspected: payload.propertyInspected,
      maintenanceRequired: payload.maintenanceRequired,
    }),
  );

  const statusLabel =
    board === "leavers"
      ? await resolveLeaverStatusLabel(nextStatus)
      : await resolveTransferStatusLabel(nextStatus);

  return {
    [statusColumnId]: { label: statusLabel },
  } as Record<string, MondayColumnValue>;
}

async function getLeaverLifecycleColumnValues(payload: LeaverLifecyclePayload) {
  return getTrackerLifecycleColumnValues("leavers", payload);
}

async function getTransferLifecycleColumnValues(payload: TrackerLifecyclePayload) {
  return getTrackerLifecycleColumnValues("transfers", payload);
}

async function getLeaverColumns(record: LeaverPayload) {
  const statusColumnId = await resolveLeaverStatusColumnId();
  const receivedLabel = await resolveLeaverStatusLabel(
    LEAVER_MONDAY_STATUS.referralReceived,
  );

  const noticeDateColumnId =
    (await resolveLeaverColumnIdByTitles("Notice Date", "Date")) ?? columns.date;
  const propertyAddressColumnId =
    (await resolveLeaverColumnIdByTitles("Property Address", "Property")) ??
    columns.propertyAddress;
  const supportOfficerColumnId =
    (await resolveLeaverColumnIdByTitles(
      "Support Officer",
      "Referral Officer",
    )) ?? columns.referralOfficer;
  const cleaningColumnId =
    (await resolveLeaverColumnIdByTitles(
      "Cleaning or Maintenance?",
      "Cleaning or Maintenance",
    )) ?? columns.cleaningOrMaintenance;

  const columnValues: Record<string, MondayColumnValue> = {
    [noticeDateColumnId]: { date: getTodayDate() },
    [propertyAddressColumnId]: formatRoomAddress(
      record.roomNumber,
      record.propertyAddress,
    ),
    [statusColumnId]: { label: receivedLabel },
    [cleaningColumnId]: { labels: ["Cleaning"] },
  };

  if (record.supportOfficerName) {
    columnValues[supportOfficerColumnId] = {
      labels: [record.supportOfficerName],
    };
  }

  return { columnValues };
}

async function getCleaningOrMaintenanceColumnValue(
  board: TrackerBoard,
  cleaningType: "cleaning" | "maintenance",
) {
  const cleaningColumnId =
    (await resolveTrackerColumnIdByTitles(
      board,
      "Cleaning or Maintenance?",
      "Cleaning or Maintenance",
    )) ?? columns.cleaningOrMaintenance;
  const label = cleaningType === "maintenance" ? "Maintenance" : "Cleaning";
  return {
    [cleaningColumnId]: { labels: [label] },
  } as Record<string, MondayColumnValue>;
}

async function getPropertyInspectedColumnValue(
  board: TrackerBoard,
  inspected: boolean,
) {
  const columnId =
    (await resolveTrackerColumnIdByTitles(
      board,
      "Property Inspected",
      "Property Live or Inspected",
      "Property Live",
    )) ?? columns.propertyLiveOrInspected;
  const label = await resolveTrackerColorLabel(
    board,
    columnId,
    inspected ? ["Yes", "YES", "yes"] : ["No", "NO", "no"],
    inspected ? "Yes" : "No",
  );
  return { [columnId]: { label } } as Record<string, MondayColumnValue>;
}

async function resolveTransferStatusColumnId() {
  if (cachedTransferStatusColumnId) {
    return cachedTransferStatusColumnId;
  }

  const statusColumnId =
    (await resolveTransferColumnIdByTitles("Status")) ?? columns.referralStatus;

  if (!statusColumnId) {
    throw new Error("Could not find Transfers Tracker Status column in Monday.");
  }

  cachedTransferStatusColumnId = statusColumnId;
  return statusColumnId;
}

async function resolveTransferStatusLabel(
  internalStatus: (typeof LEAVER_MONDAY_STATUS)[keyof typeof LEAVER_MONDAY_STATUS],
) {
  const statusColumnId = await resolveTransferStatusColumnId();
  const columnsOnBoard = await getTransfersBoardColumns();
  const columnMeta = columnsOnBoard.find((column) => column.id === statusColumnId);

  const candidatesByStatus: Record<string, string[]> = {
    [LEAVER_MONDAY_STATUS.referralReceived]: ["Referral Received"],
    [LEAVER_MONDAY_STATUS.inProgress]: ["In Progress", "In progress"],
    [LEAVER_MONDAY_STATUS.completed]: ["Complete", "Completed"],
  };

  return pickColorLabelFromSettings(
    columnMeta?.settings_str,
    candidatesByStatus[internalStatus] ?? [internalStatus],
    internalStatus,
  );
}

async function getTransferColumns(record: TransferPayload) {
  const statusColumnId = await resolveTransferStatusColumnId();
  const receivedLabel = await resolveTransferStatusLabel(
    LEAVER_MONDAY_STATUS.referralReceived,
  );

  const noticeDateColumnId =
    (await resolveTransferColumnIdByTitles(
      "Notice Date",
      "Transfer Date",
      "Date",
    )) ?? columns.date;
  const propertyAddressColumnId =
    (await resolveTransferColumnIdByTitles("Property Address", "Property")) ??
    columns.propertyAddress;
  const supportOfficerColumnId =
    (await resolveTransferColumnIdByTitles(
      "Support Officer",
      "Referral Officer",
    )) ?? columns.referralOfficer;
  const cleaningColumnId =
    (await resolveTransferColumnIdByTitles(
      "Cleaning or Maintenance?",
      "Cleaning or Maintenance",
    )) ?? columns.cleaningOrMaintenance;
  const notesColumnId =
    (await resolveTransferColumnIdByTitles("Notes", "Long text")) ??
    columns.notes;

  const columnValues: Record<string, MondayColumnValue> = {
    [noticeDateColumnId]: { date: getTodayDate() },
    [propertyAddressColumnId]: formatRoomAddress(
      record.newRoomNumber,
      record.newPropertyAddress,
    ),
    [statusColumnId]: { label: receivedLabel },
    [cleaningColumnId]: { labels: ["Cleaning"] },
    [notesColumnId]: {
      text: `Old address: ${formatRoomAddress(
        record.currentRoomNumber,
        record.currentProperty,
      )}`,
    },
  };

  if (record.supportOfficerName) {
    columnValues[supportOfficerColumnId] = {
      labels: [record.supportOfficerName],
    };
  }

  return { columnValues };
}


type ReferralLifecyclePayload = {
  itemId: string;
  referralOfficerStatus?: string | null;
  hbClaimsStatus?: string | null;
  rmsStatus?: string | null;
  tenantsManagementStatus?: string | null;
  timelineEnd?: string | null;
};

async function resolveReferralStatusLabel(
  internalStatus: (typeof REFERRAL_MONDAY_STATUS)[keyof typeof REFERRAL_MONDAY_STATUS],
) {
  const statusColumnId = await resolveReferralStatusColumnId();
  const columnsOnBoard = await getReferralBoardColumns();
  const columnMeta = columnsOnBoard.find((column) => column.id === statusColumnId);

  const candidatesByStatus: Record<string, string[]> = {
    [REFERRAL_MONDAY_STATUS.received]: ["Referral Received"],
    [REFERRAL_MONDAY_STATUS.inProgress]: ["In Progress", "In progress"],
    [REFERRAL_MONDAY_STATUS.delayed]: ["DELAYED", "Delayed"],
    [REFERRAL_MONDAY_STATUS.completed]: ["Complete", "Completed"],
  };

  return pickColorLabelFromSettings(
    columnMeta?.settings_str,
    candidatesByStatus[internalStatus] ?? [internalStatus],
    internalStatus,
  );
}

async function getReferralLifecycleColumnValues(
  payload: ReferralLifecyclePayload,
) {
  const statusColumnId = await resolveReferralStatusColumnId();
  const nextStatus = computeReferralMondayStatus({
    referralOfficerStatus: payload.referralOfficerStatus,
    hbClaimsStatus: payload.hbClaimsStatus,
    rmsStatus: payload.rmsStatus,
    tenantsManagementStatus: payload.tenantsManagementStatus,
    timelineEnd: payload.timelineEnd,
  });

  const statusLabel = await resolveReferralStatusLabel(nextStatus);

  return {
    [statusColumnId]: { label: statusLabel },
  } as Record<string, MondayColumnValue>;
}

async function getReferralTeamUpdate(
  department: string,
  outcome: string,
): Promise<Record<string, MondayColumnValue> | null> {
  const isDone = outcome === "uploaded" || outcome === "updated";

  if (department === "Referral Officer") {
    return {
      [columns.packCompleted]: { label: isDone ? "DONE" : "STUCK" },
    };
  }

  if (department === "HB Claims Team") {
    return { [columns.claimSubmitted]: { label: isDone ? "YES" : "NO" } };
  }

  if (department === "RMS Team") {
    return {
      [columns.rmsCompleted]: { label: isDone ? "COMPLETE" : "AWAITING INFO" },
    };
  }

  if (department === "Tenants Management") {
    const tenancy = await getTenancyListUpdatedColumnValue(isDone);
    return {
      [tenancy.columnId]: { label: tenancy.label },
    };
  }

  return null;
}

async function getTrackerTeamUpdate(
  board: TrackerBoard,
  department: string,
  outcome: string,
  dates?: {
    inspectionDate?: string;
    assignedDate?: string;
  },
): Promise<Record<string, MondayColumnValue> | null> {
  const isDone = outcome === "uploaded" || outcome === "updated";

  if (department === "Tenants Management") {
    const columnId =
      (await resolveTrackerColumnIdByTitles(
        board,
        "Tenants List",
        "Pack Completed",
        "Pack Done",
      )) ?? columns.packCompleted;
    const label = await resolveTrackerColorLabel(
      board,
      columnId,
      isDone ? ["Done", "DONE", "done"] : ["Stuck", "STUCK", "stuck"],
      isDone ? "Done" : "Stuck",
    );
    return { [columnId]: { label } };
  }

  if (department === "HB Claims Team") {
    const columnId =
      (await resolveTrackerColumnIdByTitles(
        board,
        "Housing Benefit BCC",
        "Claim Submitted",
        "HB Claims",
      )) ?? columns.claimSubmitted;
    const label = await resolveTrackerColorLabel(
      board,
      columnId,
      isDone ? ["Yes", "YES", "yes"] : ["No", "NO", "no"],
      isDone ? "Yes" : "No",
    );
    return { [columnId]: { label } };
  }

  if (department === "RMS Team") {
    const columnId =
      (await resolveTrackerColumnIdByTitles(board, "RMS Completed", "RMS")) ??
      columns.rmsCompleted;
    const label = await resolveTrackerColorLabel(
      board,
      columnId,
      isDone
        ? ["Complete", "COMPLETE", "complete", "Completed"]
        : ["Awaiting Info", "AWAITING INFO", "awaiting info"],
      isDone ? "Complete" : "Awaiting Info",
    );
    return { [columnId]: { label } };
  }

  if (department === "Maintenance Team" && outcome === "assigned") {
    const maintColumnId =
      (await resolveTrackerColumnIdByTitles(
        board,
        "Maintenance/Cleaning",
        "Maintenance Cleaning",
        "Maintenance",
      )) ?? columns.maintenanceCleaning;
    const timelineColumnId =
      (await resolveTrackerColumnIdByTitles(board, "Timeline")) ??
      columns.timeline;
    const assignedLabel = await resolveTrackerColorLabel(
      board,
      maintColumnId,
      ["Assigned", "ASSIGNED", "assigned"],
      "Assigned",
    );
    const values: Record<string, MondayColumnValue> = {
      [maintColumnId]: { label: assignedLabel },
    };
    if (dates?.inspectionDate && dates?.assignedDate) {
      values[timelineColumnId] = {
        from: dates.inspectionDate,
        to: dates.assignedDate,
      };
    }
    return values;
  }

  if (department === "Maintenance Team" && outcome === "completed") {
    const maintColumnId =
      (await resolveTrackerColumnIdByTitles(
        board,
        "Maintenance/Cleaning",
        "Maintenance Cleaning",
        "Maintenance",
      )) ?? columns.maintenanceCleaning;
    const completedLabel = await resolveTrackerColorLabel(
      board,
      maintColumnId,
      ["Completed", "COMPLETED", "completed", "Complete", "COMPLETE"],
      "Completed",
    );
    return { [maintColumnId]: { label: completedLabel } };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "create-referral") {
      const record = body.record as ReferralPayload;
      const created = await getReferralCreateColumns(record);
      const itemId = await createMondayItem(
        boards.referrals,
        record.fullName,
        created.columnValues,
      );

      return NextResponse.json({ itemId, timelineEnd: created.timelineEnd });
    }

    if (body.action === "create-leaver") {
      const record = body.record as LeaverPayload;
      const created = await getLeaverColumns(record);
      const itemId = await createMondayItem(
        boards.leavers,
        record.name,
        created.columnValues,
      );

      return NextResponse.json({ itemId });
    }

    if (body.action === "update-property-inspected") {
      const itemId = body.itemId as string | undefined;
      const inspected = body.inspected as boolean | undefined;
      const board = (body.board as TrackerBoard | undefined) ?? "leavers";

      if (!itemId) {
        return NextResponse.json({ error: "Missing Monday item id." }, { status: 400 });
      }

      const columnValues = await getPropertyInspectedColumnValue(
        board,
        Boolean(inspected),
      );
      await updateMondayItem(boards[board], itemId, columnValues);

      return NextResponse.json({ ok: true });
    }

    if (body.action === "sync-leaver-lifecycle") {
      const itemId = body.itemId as string | undefined;
      if (!itemId) {
        return NextResponse.json({ error: "Missing Monday item id." }, { status: 400 });
      }

      const lifecycleValues = await getLeaverLifecycleColumnValues({
        itemId,
        tenantsManagementStatus: body.tenantsManagementStatus as
          | string
          | null
          | undefined,
        hbClaimsStatus: body.hbClaimsStatus as string | null | undefined,
        rmsStatus: body.rmsStatus as string | null | undefined,
        maintenanceStatus: body.maintenanceStatus as string | null | undefined,
        propertyInspected: body.propertyInspected as boolean | undefined,
        maintenanceRequired: body.maintenanceRequired as boolean | undefined,
      });

      await updateMondayItem(boards.leavers, itemId, lifecycleValues);

      return NextResponse.json({
        ok: true,
        status: Object.values(lifecycleValues)[0],
      });
    }

    if (body.action === "sync-transfer-lifecycle") {
      const itemId = body.itemId as string | undefined;
      if (!itemId) {
        return NextResponse.json({ error: "Missing Monday item id." }, { status: 400 });
      }

      const lifecycleValues = await getTransferLifecycleColumnValues({
        itemId,
        tenantsManagementStatus: body.tenantsManagementStatus as
          | string
          | null
          | undefined,
        hbClaimsStatus: body.hbClaimsStatus as string | null | undefined,
        rmsStatus: body.rmsStatus as string | null | undefined,
        maintenanceStatus: body.maintenanceStatus as string | null | undefined,
        propertyInspected: body.propertyInspected as boolean | undefined,
        maintenanceRequired: body.maintenanceRequired as boolean | undefined,
      });

      await updateMondayItem(boards.transfers, itemId, lifecycleValues);

      return NextResponse.json({
        ok: true,
        status: Object.values(lifecycleValues)[0],
      });
    }

    if (body.action === "update-cleaning-or-maintenance") {
      const board = body.board as TrackerBoard;
      const itemId = body.itemId as string | undefined;
      const cleaningType = body.cleaningType as "cleaning" | "maintenance" | undefined;

      if (!itemId || !cleaningType) {
        return NextResponse.json(
          { error: "Missing Monday item id or cleaning type." },
          { status: 400 },
        );
      }

      const columnValues = await getCleaningOrMaintenanceColumnValue(
        board,
        cleaningType,
      );
      await updateMondayItem(boards[board], itemId, columnValues);

      return NextResponse.json({ ok: true });
    }

    if (body.action === "create-transfer") {
      const record = body.record as TransferPayload;
      const created = await getTransferColumns(record);
      const itemId = await createMondayItem(
        boards.transfers,
        record.name,
        created.columnValues,
      );

      return NextResponse.json({ itemId });
    }

    if (body.action === "update-team-status") {
      const board = body.board as keyof typeof boards;
      const itemId = body.itemId as string | undefined;
      const department = body.department as string;
      const outcome = body.outcome as string;
      const dates = body.dates as
        | { noticeDate?: string; assignedDate?: string }
        | undefined;

      if (!itemId) {
        return NextResponse.json(
          { error: "Missing Monday item id." },
          { status: 400 },
        );
      }

      const columnValues =
        board === "referrals"
          ? await getReferralTeamUpdate(department, outcome)
          : await getTrackerTeamUpdate(board as TrackerBoard, department, outcome, {
              inspectionDate: body.inspectionDate as string | undefined,
              assignedDate: dates?.assignedDate,
            });

      if (!columnValues) {
        return NextResponse.json({ skipped: true });
      }

      if (board === "referrals") {
        const lifecycleValues = await getReferralLifecycleColumnValues({
          itemId,
          referralOfficerStatus: body.referralOfficerStatus as string | null | undefined,
          hbClaimsStatus: body.hbClaimsStatus as string | null | undefined,
          rmsStatus: body.rmsStatus as string | null | undefined,
          tenantsManagementStatus: body.tenantsManagementStatus as
            | string
            | null
            | undefined,
          timelineEnd: body.timelineEnd as string | null | undefined,
        });
        await updateMondayItem(boards[board], itemId, {
          ...columnValues,
          ...lifecycleValues,
        });
      } else if (board === "leavers" || board === "transfers") {
        await updateMondayItem(boards[board], itemId, columnValues);

        const lifecycleValues = await getTrackerLifecycleColumnValues(
          board,
          {
            itemId,
            tenantsManagementStatus: body.tenantsManagementStatus as
              | string
              | null
              | undefined,
            hbClaimsStatus: body.hbClaimsStatus as string | null | undefined,
            rmsStatus: body.rmsStatus as string | null | undefined,
            maintenanceStatus: body.maintenanceStatus as string | null | undefined,
            propertyInspected: body.propertyInspected as boolean | undefined,
            maintenanceRequired: body.maintenanceRequired as boolean | undefined,
          },
        );
        await updateMondayItem(boards[board], itemId, lifecycleValues);
      } else {
        await updateMondayItem(boards[board], itemId, columnValues);
      }

      return NextResponse.json({ ok: true });
    }

    if (body.action === "sync-referral-lifecycle") {
      const itemId = body.itemId as string | undefined;
      if (!itemId) {
        return NextResponse.json({ error: "Missing Monday item id." }, { status: 400 });
      }

      const lifecycleValues = await getReferralLifecycleColumnValues({
        itemId,
        referralOfficerStatus: body.referralOfficerStatus as string | null | undefined,
        hbClaimsStatus: body.hbClaimsStatus as string | null | undefined,
        rmsStatus: body.rmsStatus as string | null | undefined,
        tenantsManagementStatus: body.tenantsManagementStatus as
          | string
          | null
          | undefined,
        timelineEnd: body.timelineEnd as string | null | undefined,
      });

      await updateMondayItem(boards.referrals, itemId, lifecycleValues);

      return NextResponse.json({
        ok: true,
        status: Object.values(lifecycleValues)[0],
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Monday API error." },
      { status: 500 },
    );
  }
}
