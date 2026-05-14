import { createClient, type SupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error(
    "supabase-admin must only be imported in server-side code (API routes).",
  );
}

let cachedClient: SupabaseClient | null = null;

function buildClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it as a server-side env var (no NEXT_PUBLIC_ prefix).",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    if (!cachedClient) {
      cachedClient = buildClient();
    }
    return Reflect.get(cachedClient, property);
  },
});
