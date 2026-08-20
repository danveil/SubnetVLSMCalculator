import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = {
  title: "Reset password — SubnetForge",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="Enter your account email and we will send a secure password reset link."
      eyebrow="Account recovery"
      footer={
        <p>
          Remembered your password? <Link href="/login">Return to sign in</Link>
        </p>
      }
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
