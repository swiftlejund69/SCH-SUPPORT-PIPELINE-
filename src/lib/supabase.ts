import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase public environment variables.");
}

const persistAuthSession = process.env.NODE_ENV === "production";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: persistAuthSession,
    autoRefreshToken: persistAuthSession,
    detectSessionInUrl: false,
  },
});

if (typeof window !== "undefined" && !persistAuthSession) {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sb-") && key.includes("auth")) {
      localStorage.removeItem(key);
    }
  }
}
