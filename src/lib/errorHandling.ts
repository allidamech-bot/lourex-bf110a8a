/**
 * Centralized error handling utilities
 * Safe async action wrapper with standardized error handling
 */

import { toast } from "sonner";

export interface AsyncActionOptions {
  successMsg?: string;
  errorMsg?: string;
  onError?: (error: unknown) => void;
  suppressToast?: boolean;
}

/**
 * Wraps async operations with consistent error handling
 * Logs errors to console and optionally shows toast
 * @param operation - async function to execute
 * @param options - error handling configuration
 * @returns operation result or null on error
 */
export const handleAsyncAction = async <T,>(
  operation: () => Promise<T>,
  options: AsyncActionOptions = {}
): Promise<T | null> => {
  const { successMsg, errorMsg, onError, suppressToast = false } = options;

  try {
    const result = await operation();

    if (successMsg && !suppressToast) {
      toast.success(successMsg);
    }

    return result;
  } catch (err: unknown) {
    // Log to console for debugging
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[AsyncActionError]", {
      error: err,
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Call optional error callback
    if (onError) {
      try {
        onError(err);
      } catch (callbackErr) {
        console.error("[AsyncActionErrorCallback]", callbackErr);
      }
    }

    // Show error toast if not suppressed
    if (!suppressToast) {
      const displayMsg = errorMsg || errorMessage || "An error occurred";
      toast.error(displayMsg);
    }

    return null;
  }
};

/**
 * Type-safe async operation result
 */
export type AsyncResult<T> = {
  data: T | null;
  error: Error | null;
  success: boolean;
};

/**
 * Wraps async operations and returns structured result
 * Useful for components that need to handle success/error explicitly
 * @param operation - async function to execute
 * @returns structured result with data, error, and success flag
 */
export const executeAsync = async <T,>(
  operation: () => Promise<T>
): Promise<AsyncResult<T>> => {
  try {
    const data = await operation();
    return {
      data,
      error: null,
      success: true,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[ExecuteAsyncError]", {
      error,
      message: error.message,
      timestamp: new Date().toISOString(),
    });

    return {
      data: null,
      error,
      success: false,
    };
  }
};
