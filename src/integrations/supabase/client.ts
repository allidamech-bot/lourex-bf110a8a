import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// تم وضع القيم يدوياً لتجاوز قيود Lovable Cloud واستخدام المشروع الجديد مباشرة
const SUPABASE_URL = "https://gxmqchznfolerliorpkz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bXFjaHpuZm9sZXJsaW9ycGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTczNDksImV4cCI6MjA5MjI5MzM0OX0.t23ESmTe2en1wHnp1c38BNoP7epbBXzi9KDY4joTukk";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase credentials are required.");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

console.log("Connected to Custom Supabase Project: gxmqchznfolerliorpkz");