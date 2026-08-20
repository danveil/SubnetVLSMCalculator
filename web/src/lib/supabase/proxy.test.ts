import { getRedirectUrl } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
type CookieMutation = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};
type CookieMethods = {
  setAll(cookies: CookieMutation[], headers: Record<string, string>): void;
};
let cookieMethods: CookieMethods | undefined;

vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((...args: unknown[]) => {
    cookieMethods = (args[2] as { cookies: CookieMethods }).cookies;
    return { auth: { getClaims } };
  }),
}));
vi.mock("./config", () => ({
  getSupabasePublicConfig: () => ({
    publishableKey: "test-publishable-key",
    url: "https://project.supabase.co",
  }),
  supabaseCookieOptions: { path: "/" },
}));

import { updateSession } from "./proxy";

describe("Supabase session proxy", () => {
  beforeEach(() => {
    getClaims.mockReset();
    cookieMethods = undefined;
  });

  it("redirects an anonymous dashboard request to login with its full safe next path", async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    const request = new NextRequest(
      "https://subnetforge.example/dashboard/projects/123?view=allocations",
    );

    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(
      "https://subnetforge.example/login?next=%2Fdashboard%2Fprojects%2F123%3Fview%3Dallocations",
    );
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("allows an authenticated dashboard request to continue", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "11111111-1111-4111-8111-111111111111" } },
      error: null,
    });
    const request = new NextRequest(
      "https://subnetforge.example/dashboard/projects/123",
    );

    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(getRedirectUrl(response)).toBeNull();
  });

  it("preserves cleared session cookies and private headers on an auth redirect", async () => {
    getClaims.mockImplementation(async () => {
      cookieMethods!.setAll(
        [
          {
            name: "sb-project-auth-token",
            value: "",
            options: { maxAge: 0, path: "/", sameSite: "lax" },
          },
        ],
        {
          "Cache-Control":
            "private, no-cache, no-store, must-revalidate, max-age=0",
          Expires: "0",
          Pragma: "no-cache",
        },
      );
      return { data: { claims: null }, error: null };
    });
    const request = new NextRequest(
      "https://subnetforge.example/dashboard?notice=stale-session",
    );

    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.cookies.get("sb-project-auth-token")).toMatchObject({
      name: "sb-project-auth-token",
      value: "",
      path: "/",
      sameSite: "lax",
    });
    expect(response.headers.get("cache-control")).toBe(
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});
