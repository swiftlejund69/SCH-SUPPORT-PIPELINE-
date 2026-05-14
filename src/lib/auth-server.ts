import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase-admin";
import { isRole, type Role } from "./auth";

export type ServerProfile = {
  id: string;
  fullName: string;
  username: string;
  role: Role;
};

function extractBearer(request: Request) {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function getCallerProfile(
  request: Request,
): Promise<ServerProfile | null> {
  const token = extractBearer(request);
  if (!token) {
    return null;
  }

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, username, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  if (!isRole(profile.role)) {
    return null;
  }

  return {
    id: profile.id,
    fullName: profile.full_name,
    username: profile.username,
    role: profile.role,
  };
}

export async function requireManager(request: Request) {
  const profile = await getCallerProfile(request);
  if (!profile) {
    return {
      profile: null,
      error: NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      ),
    };
  }
  if (profile.role !== "Manager") {
    return {
      profile: null,
      error: NextResponse.json(
        { error: "Manager role required." },
        { status: 403 },
      ),
    };
  }
  return { profile, error: null };
}
