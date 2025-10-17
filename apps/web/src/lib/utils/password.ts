/**
 * Password utility functions for validation and strength calculation.
 */

/**
 * Calculate password strength based on various criteria.
 * Returns strength level (0-4) and label with color.
 *
 * @param password - The password to evaluate
 * @returns Object containing strength level, label, and color class
 */
export function calculatePasswordStrength(password: string): {
  strength: number;
  label: string;
  color: string;
} {
  if (!password) return { strength: 0, label: '', color: '' };

  let score = 0;

  // Length criteria (0-2 points)
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character type criteria (0-3 points)
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  // Map score (0-5) to strength (0-4)
  // 0 points = 0 (nothing) - too short/empty
  // 1 point = 1 (weak) - just meets min length
  // 2 points = 2 (fair) - min length + one criteria
  // 3 points = 3 (good) - min length + two criteria
  // 4-5 points = 4 (strong) - long + multiple criteria
  let normalizedStrength = 0;
  if (score === 0) normalizedStrength = 0;
  else if (score === 1) normalizedStrength = 1;
  else if (score === 2) normalizedStrength = 2;
  else if (score === 3) normalizedStrength = 3;
  else normalizedStrength = 4; // score >= 4

  const strengthMap: Record<number, { label: string; color: string }> = {
    0: { label: '', color: '' },
    1: { label: 'Weak', color: '#ef4444' }, // red-500
    2: { label: 'Fair', color: '#f97316' }, // orange-500
    3: { label: 'Good', color: '#eab308' }, // yellow-500
    4: { label: 'Strong', color: '#22c55e' }, // green-500
  };

  return {
    strength: normalizedStrength,
    ...strengthMap[normalizedStrength],
  };
}

/**
 * Password requirements for user display.
 */
export const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional but improves strength
  description:
    'Password must be at least 8 characters with uppercase, lowercase, and number',
};
