/**
 * Pure credential validation — no I/O, unit-tested. Returns a map of
 * field → error message, empty when valid.
 */
export interface CredentialErrors {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const e = email.trim();
  if (!e) return "Email is required.";
  if (!EMAIL_RE.test(e)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 200) return "Password is too long.";
  return undefined;
}

/** Validate a login/signup credential pair. */
export function validateCredentials(
  email: string,
  password: string,
): CredentialErrors {
  const errors: CredentialErrors = {};
  const e = validateEmail(email);
  const p = validatePassword(password);
  if (e) errors.email = e;
  if (p) errors.password = p;
  return errors;
}

export function hasErrors(errors: CredentialErrors): boolean {
  return Boolean(errors.email || errors.password);
}

/** Normalize an email for storage/lookup (trim + lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
