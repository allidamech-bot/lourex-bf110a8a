import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!SUPABASE_URL) {
  throw new Error("Missing VITE_SUPABASE_URL. Check your .env file and deployment env variables.");
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY. Check your .env file and deployment env variables.");
}

export const supabase = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
);