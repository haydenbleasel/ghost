import 'server-only';
import { env } from '@/lib/env';

const HETZNER_API = 'https://api.hetzner.cloud/v1';

type HetznerResponse<T> = T & { error?: { code: string; message: string } };

export class HetznerApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(`Hetzner API ${code}: ${message}`);
    this.name = 'HetznerApiError';
    this.status = status;
    this.code = code;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

type HetznerServer = {
  id: number;
  name: string;
  status:
    | 'initializing'
    | 'starting'
    | 'running'
    | 'stopping'
    | 'off'
    | 'deleting'
    | 'migrating'
    | 'rebuilding'
    | 'unknown';
  public_net: {
    ipv4: { ip: string } | null;
    ipv6: { ip: string } | null;
  };
  created: string;
  server_type: { id: number; name: string };
  datacenter: { location: { name: string } };
};

type CreateServerResponse = {
  server: HetznerServer;
  action: { id: number; status: string };
};

async function hetznerFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${HETZNER_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.HETZNER_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as HetznerResponse<T>;

  if (!res.ok || body.error) {
    const code = body.error?.code ?? String(res.status);
    const message = body.error?.message ?? res.statusText;
    throw new HetznerApiError(res.status, code, message);
  }

  return body as T;
}

export async function createServer(input: {
  name: string;
  userData: string;
  imageId?: string;
  serverType?: string;
  location?: string;
}): Promise<HetznerServer> {
  const body = {
    name: input.name,
    server_type: input.serverType ?? env.HETZNER_SERVER_TYPE,
    location: input.location ?? env.HETZNER_LOCATION,
    image: input.imageId ?? env.HETZNER_IMAGE_ID,
    user_data: input.userData,
    start_after_create: true,
    public_net: { enable_ipv4: true, enable_ipv6: false },
  };

  const { server } = await hetznerFetch<CreateServerResponse>('/servers', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return server;
}

export async function getServer(id: number): Promise<HetznerServer | null> {
  try {
    const { server } = await hetznerFetch<{ server: HetznerServer }>(
      `/servers/${id}`
    );
    return server;
  } catch (error) {
    if (error instanceof HetznerApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function deleteServer(id: number): Promise<void> {
  await hetznerFetch<{ action: { id: number } }>(`/servers/${id}`, {
    method: 'DELETE',
  });
}

export async function powerOnServer(id: number): Promise<void> {
  await hetznerFetch(`/servers/${id}/actions/poweron`, { method: 'POST' });
}

export async function powerOffServer(id: number): Promise<void> {
  await hetznerFetch(`/servers/${id}/actions/poweroff`, { method: 'POST' });
}

export async function rebootServer(id: number): Promise<void> {
  await hetznerFetch(`/servers/${id}/actions/reboot`, { method: 'POST' });
}

export type { HetznerServer };
