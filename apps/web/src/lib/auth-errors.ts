const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Sign-in errors
  'Invalid email or password':
    'Invalid email or password. Please check your credentials and try again.',

  // Sign-up errors
  'User already exists. Use another email.':
    'This email is already registered. Please use a different email or sign in.',
  'User already exists.':
    'This email is already registered. Please use a different email or sign in.',
  'Password too short': 'Password must be at least 8 characters long.',
  'Password too long': 'Password is too long. Please use a shorter password.',
  'Invalid email': 'Please enter a valid email address.',
  'Invalid password': 'Please enter a valid password.',

  // Generic errors
  'Failed to create user': 'Unable to create account. Please try again later.',
  'Failed to create session': 'Unable to sign in. Please try again later.',
}

export function getAuthErrorMessage(
  error: { message?: string } | null | undefined,
  fallback: string,
): string {
  if (!error?.message) return fallback
  return AUTH_ERROR_MESSAGES[error.message] ?? error.message
}
