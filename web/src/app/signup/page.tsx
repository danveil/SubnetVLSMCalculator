import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "../auth-forms";
import { sanitizeNextPath } from "../auth-redirects";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = {
  title: "Create account — SubnetForge",
};

type SignupSearchParams = {
  next?: string | string[];
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<SignupSearchParams>;
}) {
  const query = await searchParams;
  const rawNext = Array.isArray(query.next) ? query.next[0] : query.next;
  const nextPath = sanitizeNextPath(rawNext);

  return (
    <AuthShell
      description="Create an account to save network plans. The calculators remain available without signing in."
      eyebrow="Save your workspace"
      footer={
        <p>
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>
            Sign in
          </Link>
        </p>
      }
      title="Create an account"
    >
      <SignupForm nextPath={nextPath} />
    </AuthShell>
  );
}
