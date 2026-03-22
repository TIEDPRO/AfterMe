import { captureVaultError } from '../services/SentryService';

/**
 * Fire-and-forget wrapper that logs failures to Sentry instead of silently swallowing.
 * Use instead of `.catch(() => {})` for background operations.
 */
export function safeAsync(promise: Promise<unknown>, context: string): void {
  promise.catch((err) => {
    captureVaultError(err, context);
  });
}
