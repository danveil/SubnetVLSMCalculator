import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { getAppOrigin } from "../../auth-redirects";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin !== requestUrl.origin) {
    return new Response(null, { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(new URL("/", getAppOrigin()), 303);
}
