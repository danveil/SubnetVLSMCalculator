import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { getAppOrigin, sanitizeNextPath } from "../../auth-redirects";

const supportedOtpTypes = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function emailOtpType(value: string | null): EmailOtpType | undefined {
  return value && supportedOtpTypes.has(value) ? value : undefined;
}

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = emailOtpType(requestUrl.searchParams.get("type"));
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createClient();
  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  if (!verified && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    verified = !error;
  }

  if (verified) {
    return privateRedirect(new URL(nextPath, getAppOrigin()));
  }

  return privateRedirect(new URL("/login?error=confirmation", getAppOrigin()));
}
