import { supabase } from "./supabase";

export const SYNTH_EMAIL_DOMAIN = "staff.local";

export const ROLES = [
  "Receptionist",
  "Referral Officer",
  "HB Claims Team",
  "RMS Team",
  "Inspector",
  "Maintenance Team",
  "Tenants Management",
  "Support Officer",
  "Manager",
] as const;

export type Role = (typeof ROLES)[number];

export type Profile = {
  id: string;
  fullName: string;
  username: string;
  role: Role;
};

export function synthEmail(username: string) {
  const slug = username
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");

  if (!slug) {
    throw new Error("Username cannot be empty.");
  }

  return `${slug}@${SYNTH_EMAIL_DOMAIN}`;
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

type RawProfileRow = {
  id: string;
  full_name: string;
  username: string;
  role: string;
};

function toProfile(row: RawProfileRow): Profile {
  if (!isRole(row.role)) {
    throw new Error(`Unknown role "${row.role}" for profile ${row.id}.`);
  }
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    role: row.role,
  };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    console.error("Could not load profile", error);
    return null;
  }

  return toProfile(data as RawProfileRow);
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}
