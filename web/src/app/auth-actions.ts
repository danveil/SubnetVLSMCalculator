"use server";

import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { authCallbackUrl, sanitizeNextPath } from "./auth-redirects";
import type { AuthActionState } from "./auth-types";
import {
  parseEmailForm,
  parseLoginForm,
  parseNewPasswordForm,
  parseSignupForm,
} from "./auth-validation";

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseLoginForm(formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      status: "error",
      message: "Unable to sign in with those credentials.",
    };
  }

  redirect(sanitizeNextPath(formData.get("next")));
}

export async function signupAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseSignupForm(formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  const nextPath = sanitizeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: authCallbackUrl(nextPath),
    },
  });

  if (error) {
    return {
      status: "error",
      message: "Unable to create your account right now. Please try again.",
    };
  }

  if (data.session) {
    redirect(nextPath);
  }

  return {
    status: "success",
    message:
      "Check your email for a confirmation link. You can close this page afterward.",
  };
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseEmailForm(formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: authCallbackUrl("/update-password"),
    },
  );

  if (error) {
    console.error(
      "Supabase password reset request failed:",
      error.code ?? error.name,
    );
  }

  // Use the same response whether or not an account exists.
  return {
    status: "success",
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseNewPasswordForm(formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    return {
      status: "error",
      message:
        "This password reset link is invalid or expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "Unable to update your password right now. Please try again.",
    };
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.error(
      "Supabase sign-out after password update failed:",
      signOutError.code ?? signOutError.name,
    );
  }

  redirect("/login?message=password-updated");
}
