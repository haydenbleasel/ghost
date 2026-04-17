import { captureException } from "@sentry/nextjs";

export const parseError = (error: unknown): string => {
  let message: string;
  if (error instanceof Error) {
    ({ message } = error);
  } else if (error && typeof error === "object" && "message" in error) {
    message = String((error as { message: unknown }).message);
  } else {
    message = String(error);
  }

  try {
    captureException(error);
  } catch {
    console.error("Sentry capture failed", error);
  }

  return message;
};
