/**
 * Error Handling Utilities
 *
 * Provides consistent error handling across the application.
 */

/**
 * Application error with context
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Log a warning with context
 */
export function logWarning(message: string, context: string, data?: unknown): void {
  console.warn(`[${context}] ${message}`, data ?? '');
}

/**
 * Log an error with context
 */
export function logError(message: string, context: string, error?: unknown): void {
  console.error(`[${context}] ${message}`, error ?? '');
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}
