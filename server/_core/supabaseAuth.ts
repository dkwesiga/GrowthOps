import { ENV } from "./env";

// Shape of the relevant fields returned by Supabase's GET /auth/v1/user.
export type SupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    name?: string;
    full_name?: string;
    [key: string]: unknown;
  };
  app_metadata?: {
    provider?: string;
    [key: string]: unknown;
  };
};

// Verifies a Supabase access token by asking Supabase who it belongs to.
// Returns the user when the token is valid, or null when it is rejected.
// Uses fetch directly so the server doesn't need the @supabase/supabase-js dep.
export async function verifySupabaseToken(
  accessToken: string
): Promise<SupabaseUser | null> {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_ANON_KEY are not configured on the server"
    );
  }

  const url = `${ENV.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: ENV.supabaseAnonKey,
    },
  });

  if (!resp.ok) {
    return null;
  }

  return (await resp.json()) as SupabaseUser;
}

// Picks the best available display name for a Supabase user. The session
// cookie requires a non-empty name, so this always returns something.
export function resolveSupabaseName(user: SupabaseUser): string {
  return (
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email ||
    "User"
  );
}
