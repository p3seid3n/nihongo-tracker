import { createClient } from "@supabase/supabase-js";
import { pickCloudEnv } from "./cloudEnv.js";

const env = pickCloudEnv(import.meta.env || {});

/** True when the deployment has a Supabase project configured. */
export const cloudConfigured = env.ok;

export const supabase = cloudConfigured
  ? createClient(env.url, env.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "nt4-auth" },
    })
  : null;
