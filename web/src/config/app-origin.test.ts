import { describe, expect, it } from "vitest";

import { resolveAppOrigin } from "./app-origin";

describe("resolveAppOrigin", () => {
  it("uses and normalizes an explicitly configured HTTPS origin", () => {
    expect(
      resolveAppOrigin({
        NEXT_PUBLIC_APP_URL: " https://subnetforge.example/ ",
      }),
    ).toBe("https://subnetforge.example");
  });

  it("accepts HTTP only for local development", () => {
    expect(
      resolveAppOrigin({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" }),
    ).toBe("http://localhost:3000");
    expect(
      resolveAppOrigin({
        NEXT_PUBLIC_APP_URL: "http://subnetforge.example",
        VERCEL_PROJECT_PRODUCTION_URL: "subnetforge.vercel.app",
      }),
    ).toBe("https://subnetforge.vercel.app");
  });

  it("adds HTTPS to Vercel's production hostname", () => {
    expect(
      resolveAppOrigin({
        VERCEL_PROJECT_PRODUCTION_URL: "subnetforge.vercel.app",
      }),
    ).toBe("https://subnetforge.vercel.app");
  });

  it.each([
    '"https://subnetforge.example"',
    "NEXT_PUBLIC_APP_URL=https://subnetforge.example",
    "subnetforge.example",
    "https://user:password@subnetforge.example",
    "https://subnetforge.example/path",
    "https://subnetforge.example?preview=true",
    "https://subnetforge.example#fragment",
  ])("falls back safely for an invalid configured app URL: %s", (value) => {
    expect(
      resolveAppOrigin({
        NEXT_PUBLIC_APP_URL: value,
        VERCEL_PROJECT_PRODUCTION_URL: "subnetforge.vercel.app",
      }),
    ).toBe("https://subnetforge.vercel.app");
  });

  it("uses localhost only when neither configured origin is usable", () => {
    expect(resolveAppOrigin({})).toBe("http://localhost:3000");
  });
});
