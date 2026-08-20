"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  forgotPasswordAction,
  loginAction,
  signupAction,
  updatePasswordAction,
} from "./auth-actions";
import styles from "./auth.module.css";
import { initialAuthState, type AuthActionState } from "./auth-types";

function StateNotice({ state }: { state: AuthActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`${styles.notice} ${
        state.status === "success" ? styles.noticeSuccess : styles.noticeError
      }`}
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <span className={styles.fieldError} id={id}>
      {message}
    </span>
  ) : null;
}

type PasswordFieldProps = {
  id: string;
  name?: string;
  label: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
};

function PasswordField({
  id,
  name = "password",
  label,
  error,
  autoComplete,
}: PasswordFieldProps) {
  const errorId = `${id}-error`;

  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={styles.input}
        id={id}
        maxLength={128}
        minLength={autoComplete === "new-password" ? 8 : undefined}
        name={name}
        required
        type="password"
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

function EmailField({ error }: { error?: string }) {
  const errorId = "email-error";

  return (
    <label className={styles.field} htmlFor="email">
      <span>Email address</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoCapitalize="none"
        autoComplete="email"
        className={styles.input}
        id="email"
        inputMode="email"
        maxLength={254}
        name="email"
        required
        spellCheck={false}
        type="email"
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <input name="next" type="hidden" value={nextPath} />
      <EmailField error={state.fieldErrors?.email} />
      <PasswordField
        autoComplete="current-password"
        error={state.fieldErrors?.password}
        id="password"
        label="Password"
      />
      <div className={styles.formMeta}>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
      <StateNotice state={state} />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SignupForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <input name="next" type="hidden" value={nextPath} />
      <EmailField error={state.fieldErrors?.email} />
      <PasswordField
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        id="password"
        label="Password"
      />
      <p className={styles.hint}>Use at least 8 characters.</p>
      <PasswordField
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword}
        id="confirm-password"
        label="Confirm password"
        name="confirmPassword"
      />
      <StateNotice state={state} />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <EmailField error={state.fieldErrors?.email} />
      <StateNotice state={state} />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Sending link…" : "Send reset link"}
      </button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <PasswordField
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        id="password"
        label="New password"
      />
      <p className={styles.hint}>Use at least 8 characters.</p>
      <PasswordField
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword}
        id="confirm-password"
        label="Confirm new password"
        name="confirmPassword"
      />
      <StateNotice state={state} />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
