/**
 * Password policy: min 8 chars, 1 uppercase, 1 number, 1 special (!@#$%^&* etc.)
 * Used for PATCH /api/me, POST/PUT /api/users.
 */
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';

export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  const hasSpecial = [...SPECIAL_CHARS].some((c) => password.includes(c));
  if (!hasSpecial) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&* etc.)' };
  }
  return { valid: true, message: null };
}
