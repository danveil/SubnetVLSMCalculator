import { beforeEach, describe, expect, it, vi } from "vitest";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signOut } })),
}));
vi.mock("../../auth-redirects", () => ({
  getAppOrigin: () => "https://subnetforge.example",
}));

import { POST } from "./route";

describe("POST /auth/signout", () => {
  beforeEach(() => {
    signOut.mockReset();
    signOut.mockResolvedValue({ error: null });
  });

  it("clears the local session and returns a private non-cacheable redirect", async () => {
    const request = new Request("https://subnetforge.example/auth/signout", {
      method: "POST",
      headers: { Origin: "https://subnetforge.example" },
    });

    const response = await POST(request);

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://subnetforge.example/",
    );
    expect(response.headers.get("cache-control")).toBe(
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it.each([undefined, "https://attacker.example"])(
    "rejects a missing or cross-origin request (%s)",
    async (origin) => {
      const headers = origin ? { Origin: origin } : undefined;
      const request = new Request("https://subnetforge.example/auth/signout", {
        method: "POST",
        headers,
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      expect(signOut).not.toHaveBeenCalled();
    },
  );
});
