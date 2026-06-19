import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — login is disabled."
  );
}

// A single shared browser client. persistSession + autoRefreshToken keep the
// user signed in across reloads; detectSessionInUrl handles the redirect back
// from social (OAuth) sign-in.
export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Posts the current Supabase access token to the backend, which verifies it and
// sets our own session cookie. Returns true when a session was bridged.
export async function bridgeSupabaseSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return false;

  const resp = await fetch("/api/auth/supabase", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ accessToken }),
  });

  if (!resp.ok) {
    console.error("[Supabase] Failed to bridge session:", await resp.text());
    return false;
  }
  return true;
}
