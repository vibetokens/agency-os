/**
 * anthropic-retry.ts
 *
 * Exponential backoff retry wrapper for Anthropic API calls.
 *
 * Retries on: 529 overloaded_error, 503 service_unavailable, 429 rate_limit.
 * Does NOT retry on: 401 auth, 400 bad request, 404 not found.
 *
 * Why this exists: On 2026-04-10 the vt-outreach pipeline was discovered to
 * have been dead for 9 days because of a 401 auth bug. Once fixed, the only
 * remaining failure mode was intermittent 529 overloaded_error from Anthropic's
 * servers. Without retry, a single 529 in a batch of 50 leads would kill the
 * entire run and skip the remaining 49.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const RETRYABLE_STATUSES = new Set([429, 503, 529]);

function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status && RETRYABLE_STATUSES.has(status)) return true;
  // Network errors (connection reset, DNS failure, etc.)
  const code = (err as { code?: string }).code;
  if (code && ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(code)) return true;
  return false;
}

/**
 * Wrap an async Anthropic call with exponential backoff retry.
 *
 * Example:
 *   const msg = await withRetry(() => client.messages.create({ ... }));
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelayMs = 2000,
    maxDelayMs = 60000,
    onRetry = defaultOnRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!isRetryableError(err) || attempt === maxRetries) {
        throw err;
      }

      // Exponential backoff with jitter: base * 2^attempt + 0-1000ms
      const baseDelay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = Math.floor(Math.random() * 1000);
      const delayMs = baseDelay + jitter;

      const errorObj = err instanceof Error ? err : new Error(String(err));
      onRetry(attempt + 1, errorObj, delayMs);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Unreachable, but satisfies TypeScript
  throw lastError;
}

function defaultOnRetry(attempt: number, error: Error, delayMs: number): void {
  const status = (error as unknown as { status?: number }).status;
  const label = status ? `HTTP ${status}` : error.message.slice(0, 60);
  console.warn(
    `  [retry ${attempt}] ${label} — waiting ${Math.round(delayMs / 1000)}s`,
  );
}
