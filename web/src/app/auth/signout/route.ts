import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { getAppOrigin } from "../../auth-redirects";

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url, 303);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin !== requestUrl.origin) {
    return new Response(null, { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  return privateRedirect(new URL("/", getAppOrigin()));
}
