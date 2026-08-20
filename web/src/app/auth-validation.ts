import type { AuthActionState } from "./auth-types";

const MAX_EMAIL_LENGTH = 254;
const MIN_NEW_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

type ParsedForm<T> =
  { ok: true; data: T } | { ok: false; state: AuthActionState };

type EmailData = { email: string };
type CredentialsData = EmailData & { password: string };
type NewPasswordData = { password: string };

function readText(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

function normalizedEmail(formData: FormData): {
  email?: string;
  error?: string;
} {
  const email = readText(formData, "email")?.trim().toLowerCase();

  if (!email) {
    return { error: "Enter your email address." };
  }

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }

  return { email };
}

function passwordError(password: string | undefined, requireNew: boolean) {
  if (!password) {
    return "Enter your password.";
  }

  if (requireNew && password.length < MIN_NEW_PASSWORD_LENGTH) {
    return `Use at least ${MIN_NEW_PASSWORD_LENGTH} characters.`;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Use no more than ${MAX_PASSWORD_LENGTH} characters.`;
  }

  return undefined;
}

function invalidState(
  fieldErrors: NonNullable<AuthActionState["fieldErrors"]>,
): ParsedForm<never> {
  return {
    ok: false,
    state: {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    },
  };
}

export function parseEmailForm(formData: FormData): ParsedForm<EmailData> {
  const emailResult = normalizedEmail(formData);

  if (!emailResult.email) {
    return invalidState({ email: emailResult.error });
  }

  return { ok: true, data: { email: emailResult.email } };
}

export function parseLoginForm(
  formData: FormData,
): ParsedForm<CredentialsData> {
  const emailResult = normalizedEmail(formData);
  const password = readText(formData, "password");
  const fieldErrors: NonNullable<AuthActionState["fieldErrors"]> = {};

  if (!emailResult.email) {
    fieldErrors.email = emailResult.error;
  }

  const invalidPassword = passwordError(password, false);
  if (invalidPassword) {
    fieldErrors.password = invalidPassword;
  }

  if (!emailResult.email || !password || Object.keys(fieldErrors).length > 0) {
    return invalidState(fieldErrors);
  }

  return { ok: true, data: { email: emailResult.email, password } };
}

export function parseSignupForm(
  formData: FormData,
): ParsedForm<CredentialsData> {
  const emailResult = normalizedEmail(formData);
  const password = readText(formData, "password");
  const confirmPassword = readText(formData, "confirmPassword");
  const fieldErrors: NonNullable<AuthActionState["fieldErrors"]> = {};

  if (!emailResult.email) {
    fieldErrors.email = emailResult.error;
  }

  const invalidPassword = passwordError(password, true);
  if (invalidPassword) {
    fieldErrors.password = invalidPassword;
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Confirm your password.";
  } else if (password && confirmPassword !== password) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (
    !emailResult.email ||
    !password ||
    !confirmPassword ||
    Object.keys(fieldErrors).length > 0
  ) {
    return invalidState(fieldErrors);
  }

  return { ok: true, data: { email: emailResult.email, password } };
}

export function parseNewPasswordForm(
  formData: FormData,
): ParsedForm<NewPasswordData> {
  const password = readText(formData, "password");
  const confirmPassword = readText(formData, "confirmPassword");
  const fieldErrors: NonNullable<AuthActionState["fieldErrors"]> = {};
  const invalidPassword = passwordError(password, true);

  if (invalidPassword) {
    fieldErrors.password = invalidPassword;
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Confirm your password.";
  } else if (password && confirmPassword !== password) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (!password || !confirmPassword || Object.keys(fieldErrors).length > 0) {
    return invalidState(fieldErrors);
  }

  return { ok: true, data: { password } };
}
