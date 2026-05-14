import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isRole, synthEmail, type Role } from "../../../../lib/auth";
import { requireManager } from "../../../../lib/auth-server";

export const runtime = "nodejs";

type CreateUserBody = {
  fullName?: string;
  username?: string;
  role?: string;
  password?: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  username: string;
  role: string;
  created_at: string;
};

export async function GET(request: Request) {
  const { error } = await requireManager(request);
  if (error) {
    return error;
  }

  const { data, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, username, role, created_at")
    .order("created_at", { ascending: false });

  if (profilesError) {
    return NextResponse.json(
      { error: profilesError.message },
      { status: 500 },
    );
  }

  const bannedUntilById = new Map<string, string | null>();
  try {
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    for (const user of usersPage?.users ?? []) {
      const rawBan = (user as { banned_until?: string | null }).banned_until;
      bannedUntilById.set(user.id, rawBan ?? null);
    }
  } catch (err) {
    console.error("Could not list auth users for revoke status", err);
  }

  function isRevoked(bannedUntil: string | null | undefined) {
    if (!bannedUntil) {
      return false;
    }
    const ts = Date.parse(bannedUntil);
    if (Number.isNaN(ts)) {
      return false;
    }
    return ts > Date.now();
  }

  return NextResponse.json({
    users: (data ?? []).map((row: ProfileRow) => ({
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      role: row.role,
      createdAt: row.created_at,
      revoked: isRevoked(bannedUntilById.get(row.id)),
    })),
  });
}

export async function POST(request: Request) {
  const { error } = await requireManager(request);
  if (error) {
    return error;
  }

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fullName = body.fullName?.trim();
  const username = body.username?.trim().toLowerCase();
  const role = body.role?.trim();
  const password = body.password;

  if (!fullName || !username || !role || !password) {
    return NextResponse.json(
      { error: "fullName, username, role and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  if (!isRole(role)) {
    return NextResponse.json(
      { error: `Unknown role "${role}".` },
      { status: 400 },
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Username already in use." },
      { status: 409 },
    );
  }

  let email: string;
  try {
    email = synthEmail(username);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid username." },
      { status: 400 },
    );
  }

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Could not create user." },
      { status: 500 },
    );
  }

  const { error: insertError } = await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    username,
    role: role as Role,
  });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      user: {
        id: created.user.id,
        fullName,
        username,
        role,
      },
    },
    { status: 201 },
  );
}
