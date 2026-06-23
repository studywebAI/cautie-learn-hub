/**
 * Error logging service: catches errors, logs them, notifies the user via Notifications,
 * and sends them to the team monitoring system.
 */

import { NotificationService } from './notifications';
import { getErrorMessage, generateErrorCode } from './error-codes';

export interface LoggedError {
  code: string;
  message: string;
  stack?: string;
  url?: string;
  timestamp: string;
  userId?: string;
  context?: Record<string, any>;
}

export class ErrorLogger {
  private static isInitialized = false;

  /**
   * Initialize global error handlers.
   */
  static initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), 'uncaught');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason || new Error('Unhandled rejection'), 'promise');
    });
  }

  /**
   * Handle and log an error, then notify the user.
   */
  static async handleError(error: unknown, source: string = 'manual', context?: Record<string, any>): Promise<string> {
    const errorCode = generateErrorCode('system');
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const loggedError: LoggedError = {
      code: errorCode,
      message: errorMessage,
      stack,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      userId: context?.userId, // Can be populated if user context is available
      context: { ...context, source },
    };

    // Send to server for team monitoring
    await this.logToServer(loggedError);

    // Notify user via in-app notification
    const locale = (context?.locale || 'en') as 'en' | 'nl';
    const msg = getErrorMessage(errorCode, locale);

    // Create a user-facing notification with error code
    try {
      const userId = context?.userId;
      if (userId) {
        await NotificationService.createNotification(userId, {
          type: 'error',
          title: msg.title,
          message: `${msg.description} (Error: ${errorCode})`,
          data: {
            error_code: errorCode,
            timestamp: loggedError.timestamp,
            action: msg.action,
          },
        });
      }
    } catch {
      // Silently fail if notification can't be sent
    }

    // Also log to browser console in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error(`[${errorCode}]`, msg.title, msg.description, error);
    }

    return errorCode;
  }

  /**
   * Send error to server for centralized logging.
   */
  private static async logToServer(error: LoggedError): Promise<void> {
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
      });
    } catch {
      // Fail silently to avoid infinite error loops
    }
  }

  /**
   * Log an error with a specific error code (for known errors).
   */
  static async logWithCode(errorCode: string, message?: string, context?: Record<string, any>): Promise<void> {
    const userId = context?.userId;
    const locale = (context?.locale || 'en') as 'en' | 'nl';
    const msg = getErrorMessage(errorCode, locale);

    const loggedError: LoggedError = {
      code: errorCode,
      message: message || msg.description,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      userId,
      context,
    };

    await this.logToServer(loggedError);

    // Notify user
    if (userId) {
      try {
        await NotificationService.createNotification(userId, {
          type: 'error',
          title: msg.title,
          message: `${msg.description} (${errorCode})`,
          data: {
            error_code: errorCode,
            timestamp: loggedError.timestamp,
            action: msg.action,
          },
        });
      } catch {
        // Silently fail
      }
    }
  }
}

/**
 * Wrap a function with error handling.
 */
export function withErrorHandler<T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, any>
): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      await ErrorLogger.handleError(error, 'function', context);
    }
  };
}

/**
 * Wrap an async function with error handling.
 */
export function withAsyncErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Record<string, any>
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | void> {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      await ErrorLogger.handleError(error, 'async_function', context);
    }
  };
}
