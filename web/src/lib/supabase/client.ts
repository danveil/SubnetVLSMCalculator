import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database";
import { getSupabasePublicConfig, supabaseCookieOptions } from "./config";

export function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createBrowserClient<Database>(url, publishableKey, {
    cookieOptions: supabaseCookieOptions,
  });
}
