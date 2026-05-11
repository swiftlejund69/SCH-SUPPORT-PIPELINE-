import { NextResponse } from "next/server";

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
  propertyLiveOrInspected: "color_mm2gd2j6",
  maintenanceCleaning: "color_mm2gwc7n",
  cleaningOrMaintenance: "dropdown_mm2t2sw2",
  timeline: "timerange_mm2gyzsm",
  propertyAddress: "text_mm2fsm35",
  notes: "long_text_mm2fr4f0",
} as const;

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

function getReferralColumns(record: ReferralPayload) {
  const columnValues: Record<string, MondayColumnValue> = {
    [columns.date]: { date: getTodayDate() },
    [columns.referralType]: {
      label: record.referralType === "sourced" ? "REFERRAL" : "WALK IN",
    },
    [columns.propertyAddress]: formatRoomAddress(
      record.currentRoomNumber,
      record.currentProperty,
    ),
  };

  if (record.referralType === "sourced" && record.referralOfficer) {
    columnValues[columns.referralOfficer] = {
      labels: [record.referralOfficer],
    };
  }

  return columnValues;
}

function getLeaverColumns(record: LeaverPayload): Record<string, MondayColumnValue> {
  const columnValues: Record<string, MondayColumnValue> = {
    [columns.date]: { date: record.leavingDate },
    [columns.propertyLiveOrInspected]: { label: "YES" },
    [columns.cleaningOrMaintenance]: {
      labels: [record.cleaningType === "maintenance" ? "Maintenance" : "Cleaning"],
    },
    [columns.propertyAddress]: formatRoomAddress(
      record.roomNumber,
      record.propertyAddress,
    ),
  };

  if (record.supportOfficerName) {
    columnValues[columns.referralOfficer] = {
      labels: [record.supportOfficerName],
    };
  }

  return columnValues;
}

function getTransferColumns(
  record: TransferPayload,
): Record<string, MondayColumnValue> {
  const columnValues: Record<string, MondayColumnValue> = {
    [columns.date]: { date: record.transferDate },
    [columns.propertyLiveOrInspected]: { label: "YES" },
    [columns.cleaningOrMaintenance]: {
      labels: [record.cleaningType === "maintenance" ? "Maintenance" : "Cleaning"],
    },
    [columns.propertyAddress]: formatRoomAddress(
      record.newRoomNumber,
      record.newPropertyAddress,
    ),
    [columns.notes]: {
      text: `Old address: ${formatRoomAddress(
        record.currentRoomNumber,
        record.currentProperty,
      )}`,
    },
  };

  if (record.supportOfficerName) {
    columnValues[columns.referralOfficer] = {
      labels: [record.supportOfficerName],
    };
  }

  return columnValues;
}

function getReferralTeamUpdate(
  department: string,
  outcome: string,
): Record<string, MondayColumnValue> | null {
  const isDone = outcome === "uploaded" || outcome === "updated";

  if (department === "Referral Officer") {
    return { [columns.packCompleted]: { label: isDone ? "DONE" : "STUCK" } };
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
    return {
      [columns.propertyLiveOrInspected]: { label: isDone ? "YES" : "NO" },
    };
  }

  return null;
}

function getLeaverTransferTeamUpdate(
  department: string,
  outcome: string,
  dates?: { noticeDate?: string; assignedDate?: string },
): Record<string, MondayColumnValue> | null {
  const isDone = outcome === "uploaded" || outcome === "updated";

  if (department === "Tenants Management") {
    return { [columns.packCompleted]: { label: isDone ? "DONE" : "STUCK" } };
  }

  if (department === "HB Claims Team") {
    return { [columns.claimSubmitted]: { label: isDone ? "YES" : "NO" } };
  }

  if (department === "RMS Team") {
    return {
      [columns.rmsCompleted]: { label: isDone ? "COMPLETE" : "AWAITING INFO" },
    };
  }

  if (department === "Maintenance Team" && outcome === "assigned") {
    return {
      [columns.maintenanceCleaning]: { label: "ASSIGNED" },
      ...(dates?.noticeDate && dates.assignedDate
        ? {
            [columns.timeline]: {
              from: dates.noticeDate,
              to: dates.assignedDate,
            },
          }
        : {}),
    };
  }

  if (department === "Maintenance Team" && outcome === "completed") {
    return { [columns.maintenanceCleaning]: { label: "COMPLETED" } };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "create-referral") {
      const record = body.record as ReferralPayload;
      const itemId = await createMondayItem(
        boards.referrals,
        record.fullName,
        getReferralColumns(record),
      );

      return NextResponse.json({ itemId });
    }

    if (body.action === "create-leaver") {
      const record = body.record as LeaverPayload;
      const itemId = await createMondayItem(
        boards.leavers,
        record.name,
        getLeaverColumns(record),
      );

      return NextResponse.json({ itemId });
    }

    if (body.action === "create-transfer") {
      const record = body.record as TransferPayload;
      const itemId = await createMondayItem(
        boards.transfers,
        record.name,
        getTransferColumns(record),
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
          ? getReferralTeamUpdate(department, outcome)
          : getLeaverTransferTeamUpdate(department, outcome, dates);

      if (!columnValues) {
        return NextResponse.json({ skipped: true });
      }

      await updateMondayItem(boards[board], itemId, columnValues);

      return NextResponse.json({ ok: true });
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
