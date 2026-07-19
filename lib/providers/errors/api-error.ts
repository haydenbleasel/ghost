export class ProviderApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(`Provider API ${code}: ${message}`);
    this.name = "ProviderApiError";
    this.status = status;
    this.code = code;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export const formatProviderError = (
  error: unknown,
  response: Response
): string => {
  const body = error as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? response.statusText;
};
