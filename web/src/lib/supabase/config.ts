export interface SupabasePublicConfig {
  readonly url: string;
  readonly publishableKey: string;
}

const localSupabaseHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const supabaseCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function normalizeSupabaseProjectUrl(value: string): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value.trim());
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a complete URL.");
  }

  const isLocalHttp =
    parsedUrl.protocol === "http:" &&
    localSupabaseHosts.has(parsedUrl.hostname);
  if (parsedUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must use HTTPS except during local development.",
    );
  }

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be an origin without credentials, a path, query parameters, or a fragment.",
    );
  }

  return parsedUrl.origin;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url: normalizeSupabaseProjectUrl(url), publishableKey };
}
