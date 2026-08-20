import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "./auth-redirects";
import {
  parseEmailForm,
  parseLoginForm,
  parseNewPasswordForm,
  parseSignupForm,
} from "./auth-validation";

function formData(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([name, value]) => data.set(name, value));
  return data;
}

describe("auth form validation", () => {
  it("normalizes an email address", () => {
    const result = parseEmailForm(formData({ email: "  USER@Example.COM " }));

    expect(result).toEqual({
      ok: true,
      data: { email: "user@example.com" },
    });
  });

  it("rejects malformed credentials before contacting Supabase", () => {
    const result = parseLoginForm(
      formData({ email: "not-an-email", password: "" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.state.fieldErrors).toEqual({
        email: "Enter a valid email address.",
        password: "Enter your password.",
      });
    }
  });

  it("requires a suitable new password and matching confirmation", () => {
    const result = parseSignupForm(
      formData({
        email: "user@example.com",
        password: "short",
        confirmPassword: "different",
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.state.fieldErrors?.password).toContain("at least 8");
      expect(result.state.fieldErrors?.confirmPassword).toBe(
        "Passwords do not match.",
      );
    }
  });

  it("accepts a valid password update", () => {
    const result = parseNewPasswordForm(
      formData({ password: "correct horse", confirmPassword: "correct horse" }),
    );

    expect(result).toEqual({
      ok: true,
      data: { password: "correct horse" },
    });
  });
});

describe("safe post-auth redirects", () => {
  it("preserves same-origin paths with query strings", () => {
    expect(sanitizeNextPath("/dashboard?project=123")).toBe(
      "/dashboard?project=123",
    );
  });

  it.each([
    "https://attacker.example",
    "//attacker.example/path",
    "/\\attacker.example/path",
    "dashboard",
  ])("rejects an unsafe redirect target: %s", (target) => {
    expect(sanitizeNextPath(target)).toBe("/dashboard");
  });
});
