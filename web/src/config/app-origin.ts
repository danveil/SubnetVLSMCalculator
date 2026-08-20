const DEFAULT_LOCAL_ORIGIN = "http://localhost:3000";
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

interface AppOriginEnvironment {
  readonly NEXT_PUBLIC_APP_URL?: string;
  readonly VERCEL_PROJECT_PRODUCTION_URL?: string;
}

function normalizeHttpOrigin(value: string | undefined, addHttps = false) {
  const rawValue = value?.trim();
  if (!rawValue) {
    return undefined;
  }

  try {
    const url = new URL(
      addHttps && !rawValue.includes("://") ? `https://${rawValue}` : rawValue,
    );
    const isLocalHttp =
      url.protocol === "http:" && localHosts.has(url.hostname);

    if (url.protocol !== "https:" && !isLocalHttp) {
      return undefined;
    }

    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

export function resolveAppOrigin(
  environment: AppOriginEnvironment = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  },
): string {
  return (
    normalizeHttpOrigin(environment.NEXT_PUBLIC_APP_URL) ??
    normalizeHttpOrigin(environment.VERCEL_PROJECT_PRODUCTION_URL, true) ??
    DEFAULT_LOCAL_ORIGIN
  );
}
