import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getVerifiedUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getVerifiedUser: authMocks.getVerifiedUser,
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: authMocks.redirect,
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    authMocks.getVerifiedUser.mockReset();
    authMocks.redirect.mockReset();
    authMocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`NEXT_REDIRECT:${destination}`);
    });
  });

  it("redirects a verified user to the requested dashboard page", async () => {
    authMocks.getVerifiedUser.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "user@example.com",
    });

    await expect(
      LoginPage({
        searchParams: Promise.resolve({ next: "/dashboard/new" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/new");
    expect(authMocks.redirect).toHaveBeenCalledWith("/dashboard/new");
  });

  it("defuses a verified user's self-referential login destination", async () => {
    authMocks.getVerifiedUser.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "user@example.com",
    });

    await expect(
      LoginPage({
        searchParams: Promise.resolve({ next: "/login?next=/login" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(authMocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the sign-in form for an anonymous visitor", async () => {
    authMocks.getVerifiedUser.mockResolvedValue(null);

    const page = await LoginPage({ searchParams: Promise.resolve({}) });

    expect(authMocks.redirect).not.toHaveBeenCalled();
    expect(page.props.title).toBe("Sign in");
  });
});
