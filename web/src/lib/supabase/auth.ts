import "server-only";

import { createClient } from "./server";

export interface VerifiedUser {
  readonly id: string;
  readonly email: string | null;
}

export async function getVerifiedUser(): Promise<VerifiedUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string" || !subject) {
    return null;
  }

  return {
    id: subject,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
}
