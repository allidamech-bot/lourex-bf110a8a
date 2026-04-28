import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
export const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();

export const missingSupabaseEnvVars = [
  !SUPABASE_URL ? "VITE_SUPABASE_URL" : null,
  !SUPABASE_PUBLISHABLE_KEY ? "VITE_SUPABASE_PUBLISHABLE_KEY" : null,
].filter(Boolean) as string[];

export const isSupabaseConfigured = missingSupabaseEnvVars.length === 0;

export const supabase = createClient<Database>(
    SUPABASE_URL || "https://missing-supabase-url.supabase.co",
    SUPABASE_PUBLISHABLE_KEY || "missing-supabase-publishable-key",
    {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
);
