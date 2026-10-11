// Which Supabase address and key this build was given. Two ways to supply them:
//  - by hand:   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
//  - by Vercel: the Supabase integration (Vercel → Storage) adds NEXT_PUBLIC_SUPABASE_URL and
//               NEXT_PUBLIC_SUPABASE_ANON_KEY (or ..._PUBLISHABLE_KEY), which vite.config.js lets through.
const first = (...v) => v.find((x) => typeof x === "string" && x.trim())?.trim() || "";

export function pickCloudEnv(env = {}) {
  const url = first(env.VITE_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL);
  const key = first(
    env.VITE_SUPABASE_ANON_KEY, env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return { url, key, ok: /^https?:\/\//.test(url) && !!key };
}
