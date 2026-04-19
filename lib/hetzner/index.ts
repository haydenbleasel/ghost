import "server-only";
import { env } from "@/lib/env";
import createClient from "openapi-fetch";
import type { paths } from "./schema";

export const hetzner = createClient<paths>({
  baseUrl: "https://api.hetzner.cloud/v1",
  headers: {
    Authorization: `Bearer ${env.HETZNER_TOKEN}`,
  },
});

export class HetznerApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(`Hetzner API ${code}: ${message}`);
    this.name = "HetznerApiError";
    this.status = status;
    this.code = code;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export const throwIfHetznerError = (error: unknown, response: Response): void => {
  if (response.ok) {
    return;
  }
  const body = error as { error?: { code?: string; message?: string } } | undefined;
  const code = body?.error?.code ?? String(response.status);
  const message = body?.error?.message ?? response.statusText;
  throw new HetznerApiError(response.status, code, message);
};
