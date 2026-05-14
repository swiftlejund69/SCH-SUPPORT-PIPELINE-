import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { isRole } from "../../../../../lib/auth";
import { requireManager } from "../../../../../lib/auth-server";

export const runtime = "nodejs";

type PatchBody = {
  fullName?: string;
  role?: string;
  password?: string;
  access?: "revoke" | "restore";
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { profile, error } = await requireManager(request);
  if (error) {
    return error;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (body.fullName?.trim()) {
    updates.full_name = body.fullName.trim();
  }
  if (body.role?.trim()) {
    if (!isRole(body.role.trim())) {
      return NextResponse.json(
        { error: `Unknown role "${body.role}".` },
        { status: 400 },
      );
    }
    updates.role = body.role.trim();
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }
  }

  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }
    const { error: passwordError } =
      await supabaseAdmin.auth.admin.updateUserById(id, {
        password: body.password,
      });
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError.message },
        { status: 500 },
      );
    }
  }

  if (body.access) {
    if (body.access === "revoke" && profile && profile.id === id) {
      return NextResponse.json(
        { error: "You cannot revoke your own access." },
        { status: 400 },
      );
    }
    const banDuration = body.access === "revoke" ? "87600h" : "none";
    const { error: banError } =
      await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: banDuration,
      } as { ban_duration: string });
    if (banError) {
      return NextResponse.json(
        { error: banError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { profile, error } = await requireManager(request);
  if (error) {
    return error;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  if (profile && profile.id === id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  await supabaseAdmin.from("profiles").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
