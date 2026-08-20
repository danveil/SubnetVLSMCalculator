import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const browserAuth = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: browserAuth.createClient,
}));

import { PublicNavigation } from "./PublicNavigation";
import { PublicNavigationSession } from "./PublicNavigationSession";

type AuthStateCallback = (event: string, session: object | null) => void;

let authStateCallback: AuthStateCallback;

describe("PublicNavigation", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    browserAuth.getClaims.mockReset();
    browserAuth.onAuthStateChange.mockReset();
    browserAuth.unsubscribe.mockReset();
    browserAuth.createClient.mockReset();
    browserAuth.getClaims.mockReturnValue(new Promise(() => {}));
    browserAuth.onAuthStateChange.mockImplementation(
      (callback: AuthStateCallback) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: browserAuth.unsubscribe } },
        };
      },
    );
    browserAuth.createClient.mockReturnValue({
      auth: {
        getClaims: browserAuth.getClaims,
        onAuthStateChange: browserAuth.onAuthStateChange,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("offers sign-in while keeping public tools available anonymously", () => {
    render(<PublicNavigation authState="signed-out" />);

    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });

    expect(
      within(navigation)
        .getByRole("link", { name: "Calculator" })
        .getAttribute("href"),
    ).toBe("#workspace");
    expect(
      within(navigation)
        .getByRole("link", { name: "Projects" })
        .getAttribute("href"),
    ).toBe("/dashboard");
    expect(
      within(navigation)
        .getByRole("link", { name: "Sign in" })
        .getAttribute("href"),
    ).toBe("/login");
    expect(
      within(navigation).queryByRole("button", { name: "Sign out" }),
    ).toBeNull();
    expect(within(navigation).getByText("Local-first")).toBeTruthy();
  });

  it("offers project access and POST sign-out for an authenticated session", () => {
    render(<PublicNavigation authState="signed-in" />);

    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    const signOut = within(navigation).getByRole("button", {
      name: "Sign out",
    });
    const form = signOut.closest("form");

    expect(
      within(navigation)
        .getByRole("link", { name: "Projects" })
        .getAttribute("href"),
    ).toBe("/dashboard");
    expect(
      within(navigation).queryByRole("link", { name: "Sign in" }),
    ).toBeNull();
    expect(form?.getAttribute("action")).toBe("/auth/signout");
    expect(form?.getAttribute("method")).toBe("post");
    expect(within(navigation).getByText("Cloud workspace")).toBeTruthy();
  });

  it("does not flash account actions while the browser session is loading", () => {
    render(<PublicNavigation authState="checking" />);

    expect(screen.getByRole("status").textContent).toBe("Checking account");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("keeps anonymous navigation usable without Supabase configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    render(<PublicNavigationSession />);

    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(browserAuth.createClient).not.toHaveBeenCalled();
  });

  it("updates the account action from browser auth events and unsubscribes", () => {
    const { unmount } = render(<PublicNavigationSession />);

    act(() => {
      authStateCallback("INITIAL_SESSION", { access_token: "test-token" });
    });

    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();

    unmount();
    expect(browserAuth.unsubscribe).toHaveBeenCalledOnce();
  });

  it("uses verified browser claims when no auth event has fired", async () => {
    browserAuth.getClaims.mockResolvedValue({
      data: { claims: { sub: "11111111-1111-4111-8111-111111111111" } },
      error: null,
    });

    render(<PublicNavigationSession />);

    expect(
      await screen.findByRole("button", { name: "Sign out" }),
    ).toBeTruthy();
  });
});
