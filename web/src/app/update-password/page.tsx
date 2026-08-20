import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { UpdatePasswordForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = {
  title: "Choose a new password — SubnetForge",
};

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login?message=reset-session-required");
  }

  return (
    <AuthShell
      description="Choose a new password for your SubnetForge account."
      eyebrow="Account recovery"
      footer={
        <p>
          Need another link?{" "}
          <Link href="/forgot-password">Restart password recovery</Link>
        </p>
      }
      title="Choose a new password"
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
