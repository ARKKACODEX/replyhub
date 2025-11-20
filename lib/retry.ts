/**
 * Retry utility for handling transient failures with external services
 */

export type RetryOptions = {
  maxAttempts?: number
  delayMs?: number
  backoff?: 'exponential' | 'linear'
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Execute a function with automatic retry logic
 * @param fn The async function to execute
 * @param options Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = 'exponential',
    onRetry,
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw lastError
      }

      // Calculate delay based on backoff strategy
      const delay = backoff === 'exponential'
        ? delayMs * Math.pow(2, attempt - 1)
        : delayMs * attempt

      // Call retry callback if provided
      onRetry?.(attempt, lastError)

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Database query wrapper with retry logic
 * Useful for handling connection issues
 */
export async function dbQueryWithRetry<T>(
  queryFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(queryFn, {
    maxAttempts: 3,
    delayMs: 1000,
    backoff: 'exponential',
    ...options,
    onRetry: (attempt, error) => {
      console.log(`Database query failed (attempt ${attempt}):`, error.message)
      options.onRetry?.(attempt, error)
    },
  })
}
