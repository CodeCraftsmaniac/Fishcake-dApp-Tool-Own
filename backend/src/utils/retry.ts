/**
 * Retry utility with exponential backoff and timeout support.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Execute an async function with retry logic and optional timeout.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 10000,
    timeoutMs = 30000,
    onRetry,
  } = options;

  const executeWithTimeout = async (): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = timeoutMs > 0
        ? setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        : null;

      fn()
        .then((result) => {
          if (timer) clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          if (timer) clearTimeout(timer);
          reject(error);
        });
    });
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executeWithTimeout();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (attempt >= maxRetries) {
        throw err;
      }

      if (onRetry) {
        onRetry(err, attempt + 1);
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        maxDelayMs
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here
  throw new Error('Retry exhausted');
}

/**
 * Wrap an ethers contract call with retry logic.
 */
export function withContractRetry<T>(
  contractCall: () => Promise<T>,
  methodName: string,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(contractCall, {
    maxRetries: options.maxRetries ?? 3,
    baseDelayMs: options.baseDelayMs ?? 500,
    timeoutMs: options.timeoutMs ?? 15000,
    onRetry: (error, attempt) => {
      if (options.onRetry) {
        options.onRetry(error, attempt);
      }
    },
  });
}
