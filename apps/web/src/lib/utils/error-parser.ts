/**
 * Parse upload errors into user-friendly messages.
 *
 * Converts technical error messages from the backend into human-readable
 * messages that guide users toward resolving the issue.
 */

export function parseUploadError(error: Error): string {
  const message = error.message.toLowerCase();

  // Parse Supabase InvalidKey errors (emoji/special character issues)
  if (message.includes('invalidkey') || message.includes('invalid key')) {
    return 'File name contains unsupported characters. Please rename the file and remove emojis or special characters.';
  }

  // Parse file size errors
  if (
    message.includes('too large') ||
    message.includes('413') ||
    message.includes('file size')
  ) {
    return 'File is too large. Maximum size is 50MB.';
  }

  // Parse file type errors
  if (
    message.includes('unsupported file type') ||
    message.includes('415') ||
    message.includes('file type')
  ) {
    return 'File type not supported. Please upload PDF, DOCX, TXT, CSV, or XLSX files.';
  }

  // Parse authentication errors
  if (
    message.includes('authentication') ||
    message.includes('401') ||
    message.includes('unauthorized')
  ) {
    return 'Your session has expired. Please log in again.';
  }

  // Parse network/timeout errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch')
  ) {
    return 'Network error. Please check your connection and try again.';
  }

  // Parse storage errors
  if (
    message.includes('storage') ||
    message.includes('bucket') ||
    message.includes('upload failed')
  ) {
    return 'Failed to upload file to storage. Please try again.';
  }

  // Parse space/permission errors
  if (message.includes('space') || message.includes('permission')) {
    return 'You do not have permission to upload files to this space.';
  }

  // Generic fallback
  return 'Failed to upload file. Please try again or contact support.';
}

/**
 * Validate filename for problematic characters before upload.
 *
 * Provides early feedback to users about filename issues that would
 * cause upload failures.
 */
export function validateFilename(filename: string): {
  valid: boolean;
  message?: string;
} {
  // Check for emojis (using a simpler pattern compatible with ES5)
  // This pattern matches most common emojis
  const emojiPattern =
    /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/;
  if (emojiPattern.test(filename)) {
    return {
      valid: false,
      message:
        'Filename contains emojis. Files will be renamed automatically during upload.',
    };
  }

  // Check for problematic special characters
  // Note: We're more lenient here since backend will sanitize
  // This is just to warn users about characters that will be changed
  const hasSpecialChars = /[<>:"|?*\x00-\x1F()[\]{}@#$%&+=;,]/.test(filename);
  if (hasSpecialChars) {
    return {
      valid: false,
      message:
        'Filename contains special characters that will be replaced during upload.',
    };
  }

  return { valid: true };
}

/**
 * Get a user-friendly error message for file validation errors.
 */
export function getValidationErrorMessage(
  type: 'size' | 'type' | 'count',
  details?: { filename?: string; maxSize?: number; maxCount?: number }
): string {
  switch (type) {
    case 'size':
      return details?.filename && details?.maxSize
        ? `${details.filename} exceeds ${details.maxSize}MB limit`
        : 'File is too large';

    case 'type':
      return details?.filename
        ? `${details.filename} is not a supported file type`
        : 'File type not supported';

    case 'count':
      return details?.maxCount
        ? `Maximum ${details.maxCount} files allowed`
        : 'Too many files selected';

    default:
      return 'File validation failed';
  }
}
