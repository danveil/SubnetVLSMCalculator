const INTERNAL_ORIGIN = "https://subnetforge.invalid";

function httpOrigin(value: string | undefined, addHttps = false) {
  const rawValue = value?.trim();
  if (!rawValue) {
    return undefined;
  }

  try {
    const url = new URL(
      addHttps && !rawValue.includes("://") ? `https://${rawValue}` : rawValue,
    );

    const isLocalHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

    if (url.protocol !== "https:" && !isLocalHttp) {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

export function getAppOrigin() {
  return (
    httpOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    httpOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL, true) ??
    "http://localhost:3000"
  );
}

export function sanitizeNextPath(
  value: unknown,
  fallback = "/dashboard",
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    /[\u0000-\u001f\u007f\\]/u.test(candidate)
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function sanitizeLoginDestination(value: unknown): string {
  const nextPath = sanitizeNextPath(value);
  const pathname = new URL(nextPath, INTERNAL_ORIGIN).pathname.replace(
    /\/+$/u,
    "",
  );

  return pathname === "/login" ? "/dashboard" : nextPath;
}

export function authCallbackUrl(nextPath: string) {
  const url = new URL("/auth/confirm", getAppOrigin());
  url.searchParams.set("next", sanitizeNextPath(nextPath));
  return url.toString();
}
