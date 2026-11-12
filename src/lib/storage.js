import { createClient } from "@supabase/supabase-js";

let supabaseClient;

export function getStorageBucket() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Supabase Storage environment variables are missing.");
    }

    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient.storage.from("edubuddy-notes");
}