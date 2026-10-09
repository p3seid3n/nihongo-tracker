import { supabase, cloudConfigured } from "./supabase.js";

export { cloudConfigured };

const friendly = (e) => {
  const m = (e && e.message) || String(e);
  if (/Invalid login credentials/i.test(m)) return "That email and password don't match.";
  if (/Email not confirmed/i.test(m)) return "Please confirm your email first. Check your inbox for the link.";
  if (/already registered|already been registered/i.test(m)) return "There is already an account with this email. Sign in instead.";
  if (/Password should be at least/i.test(m)) return "Use a password with at least 6 characters.";
  if (/rate limit|too many/i.test(m)) return "Too many attempts. Wait a minute and try again.";
  if (/fetch|network|Failed/i.test(m)) return "Can't reach the server. Check your connection.";
  return m;
};

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendly(error));
  return data.session;
}

/** Returns { session, needsConfirm } */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
  if (error) throw new Error(friendly(error));
  return { session: data.session, needsConfirm: !data.session };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
  if (error) throw new Error(friendly(error));
}

export async function setNewPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(friendly(error));
}

export async function getSession() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session || null;
  } catch {
    return null;
  }
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}
