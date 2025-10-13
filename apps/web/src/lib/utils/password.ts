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

  let strength = 0;

  // Length criteria
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;

  // Character type criteria
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;

  // Normalize to 0-4 scale
  const normalizedStrength = Math.min(Math.floor((strength / 5) * 4), 4);

  const strengthMap: Record<number, { label: string; color: string }> = {
    0: { label: '', color: '' },
    1: { label: 'Weak', color: 'bg-red-500' },
    2: { label: 'Fair', color: 'bg-orange-500' },
    3: { label: 'Good', color: 'bg-yellow-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
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
