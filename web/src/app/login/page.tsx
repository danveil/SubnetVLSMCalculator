import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "../auth-forms";
import { sanitizeNextPath } from "../auth-redirects";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = {
  title: "Sign in — SubnetForge",
};

type LoginSearchParams = {
  next?: string | string[];
  message?: string | string[];
  error?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const query = await searchParams;
  const message = firstValue(query.message);
  const error = firstValue(query.error);
  const nextPath = sanitizeNextPath(firstValue(query.next));
  const notice =
    message === "password-updated"
      ? {
          tone: "success" as const,
          message: "Your password was updated. Sign in with the new password.",
        }
      : message === "reset-session-required"
        ? {
            tone: "error" as const,
            message: "Open the latest password reset link from your email.",
          }
        : error === "confirmation"
          ? {
              tone: "error" as const,
              message:
                "That confirmation link is invalid or expired. Request a new link and try again.",
            }
          : undefined;

  return (
    <AuthShell
      description="Access saved address plans and continue your workspace across devices."
      eyebrow="Account access"
      footer={
        <p>
          New to SubnetForge?{" "}
          <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>
            Create an account
          </Link>
        </p>
      }
      notice={notice}
      title="Sign in"
    >
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
