import { resolveAppOrigin } from "@/config/app-origin";

const INTERNAL_ORIGIN = "https://subnetforge.invalid";

export function getAppOrigin() {
  return resolveAppOrigin();
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
