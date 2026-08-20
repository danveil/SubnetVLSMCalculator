import { afterEach, describe, expect, it } from "vitest";

import { getSupabasePublicConfig } from "./config";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  }
  if (originalKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});

describe("getSupabasePublicConfig", () => {
  it("normalizes a valid public configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://example.supabase.co/ ";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " public-key ";

    expect(getSupabasePublicConfig()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "public-key",
    });
  });

  it("rejects missing configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "";

    expect(() => getSupabasePublicConfig()).toThrow(
      "Supabase is not configured",
    );
  });

  it("rejects malformed URLs", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";

    expect(() => getSupabasePublicConfig()).toThrow("complete URL");
  });

  it("accepts an HTTP origin only for a local Supabase instance", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321/";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";

    expect(getSupabasePublicConfig().url).toBe("http://127.0.0.1:54321");

    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://example.supabase.co";
    expect(() => getSupabasePublicConfig()).toThrow("must use HTTPS");
  });

  it.each([
    "https://user:password@example.supabase.co",
    "https://example.supabase.co/rest/v1",
    "https://example.supabase.co?redirect=elsewhere",
    "https://example.supabase.co#fragment",
  ])("rejects a non-origin Supabase URL: %s", (url) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";

    expect(() => getSupabasePublicConfig()).toThrow("must be an origin");
  });
});
