import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

export function createServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service role environment variables are missing.");
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
