import { createClient } from "@supabase/supabase-js";

const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

/** True when the deployment has a Supabase project configured. */
export const cloudConfigured = !!(url && key && /^https?:\/\//.test(url));

export const supabase = cloudConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "nt4-auth" },
    })
  : null;
