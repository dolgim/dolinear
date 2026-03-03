/**
 * Maps Better Auth error codes to user-friendly messages.
 *
 * Better Auth returns `{ code: "UPPER_SNAKE_CASE", message: "..." }` in error
 * responses. We key on `code` (stable identifier) rather than `message`
 * (human-readable text that may change across versions).
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Sign-in errors
  INVALID_EMAIL_OR_PASSWORD:
    'Invalid email or password. Please check your credentials and try again.',

  // Sign-up errors
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'This email is already registered. Please use a different email or sign in.',
  USER_ALREADY_EXISTS:
    'This email is already registered. Please use a different email or sign in.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
  PASSWORD_TOO_LONG: 'Password is too long. Please use a shorter password.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PASSWORD: 'Please enter a valid password.',

  // Generic errors
  FAILED_TO_CREATE_USER: 'Unable to create account. Please try again later.',
  FAILED_TO_CREATE_SESSION: 'Unable to sign in. Please try again later.',
}

export function getAuthErrorMessage(
  error: { code?: string; message?: string } | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code]
  }
  return error.message || fallback
}
