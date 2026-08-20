import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/login/:path*",
    "/signup/:path*",
    "/forgot-password/:path*",
    "/update-password/:path*",
    "/auth/:path*",
    "/dashboard/:path*",
  ],
};
