import { captureException } from '@sentry/nextjs';

export const parseError = (error: unknown): string => {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);

  try {
    captureException(error);
  } catch {
    console.error('Sentry capture failed', error);
  }

  return message;
};
