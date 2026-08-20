import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: mocks.createClient,
}));

import { PublicNavigationSession } from "./PublicNavigationSession";

describe("PublicNavigationSession", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    mocks.getClaims.mockReset();
    mocks.onAuthStateChange.mockReset();
    mocks.unsubscribe.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockReturnValue({
      auth: {
        getClaims: mocks.getClaims,
        onAuthStateChange: mocks.onAuthStateChange,
      },
    });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders anonymous navigation when Supabase has no verified claims", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: null });

    render(<PublicNavigationSession />);

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("renders authenticated navigation for verified Supabase claims", async () => {
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: { sub: "11111111-1111-4111-8111-111111111111" },
      },
      error: null,
    });

    render(<PublicNavigationSession />);

    expect(screen.getByRole("status").textContent).toBe("Checking account");
    expect(
      await screen.findByRole("button", { name: "Sign out" }),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("falls back to anonymous navigation when public Supabase config is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    render(<PublicNavigationSession />);

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("reacts to auth events and unsubscribes when navigation unmounts", async () => {
    let authListener:
      | ((event: string, session: Record<string, never> | null) => void)
      | undefined;
    mocks.getClaims.mockReturnValue(new Promise(() => undefined));
    mocks.onAuthStateChange.mockImplementation(
      (
        listener: (
          event: string,
          session: Record<string, never> | null,
        ) => void,
      ) => {
        authListener = listener;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      },
    );
    const { unmount } = render(<PublicNavigationSession />);

    await act(async () => {
      authListener?.("SIGNED_IN", {});
    });

    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
});
