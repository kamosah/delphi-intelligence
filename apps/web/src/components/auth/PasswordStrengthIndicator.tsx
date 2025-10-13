import { calculatePasswordStrength } from '@/lib/utils/password';

interface PasswordStrengthIndicatorProps {
  /**
   * The password to evaluate
   */
  password: string;
  /**
   * Optional className for the container
   */
  className?: string;
}

/**
 * Password strength indicator component.
 * Displays a visual representation of password strength with label and color-coded bars.
 * Uses the shared calculatePasswordStrength utility for consistent evaluation.
 *
 * @example
 * ```tsx
 * const [password, setPassword] = useState('');
 * <PasswordStrengthIndicator password={password} />
 * ```
 */
export function PasswordStrengthIndicator({
  password,
  className = '',
}: PasswordStrengthIndicatorProps) {
  const passwordStrength = calculatePasswordStrength(password);

  // Don't show anything if password is empty or strength is 0
  if (!password || passwordStrength.strength === 0) {
    return null;
  }

  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">Password strength:</span>
        <span className="text-xs font-medium text-gray-700">
          {passwordStrength.label}
        </span>
      </div>
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`flex-1 rounded-full transition-colors ${
              level <= passwordStrength.strength
                ? passwordStrength.color
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
