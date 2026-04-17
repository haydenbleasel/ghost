import "server-only";
import { env } from "@/lib/env";

const HETZNER_API = "https://api.hetzner.cloud/v1";

type HetznerResponse<T> = T & { error?: { code: string; message: string } };

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

interface HetznerServer {
  id: number;
  name: string;
  status:
    | "initializing"
    | "starting"
    | "running"
    | "stopping"
    | "off"
    | "deleting"
    | "migrating"
    | "rebuilding"
    | "unknown";
  public_net: {
    ipv4: { ip: string } | null;
    ipv6: { ip: string } | null;
  };
  created: string;
  server_type: { id: number; name: string };
  datacenter: { location: { name: string } };
}

interface CreateServerResponse {
  server: HetznerServer;
  action: { id: number; status: string };
}

const hetznerFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${HETZNER_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.HETZNER_TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = (await res.json().catch(() => ({}))) as HetznerResponse<T>;

  if (!res.ok || body.error) {
    const code = body.error?.code ?? String(res.status);
    const message = body.error?.message ?? res.statusText;
    throw new HetznerApiError(res.status, code, message);
  }

  return body as T;
};

export const createServer = async (input: {
  name: string;
  userData: string;
  imageId?: string;
  serverType?: string;
  location?: string;
}): Promise<HetznerServer> => {
  const body = {
    image: input.imageId ?? env.HETZNER_IMAGE_ID,
    location: input.location ?? env.HETZNER_LOCATION,
    name: input.name,
    public_net: { enable_ipv4: true, enable_ipv6: false },
    server_type: input.serverType ?? env.HETZNER_SERVER_TYPE,
    start_after_create: true,
    user_data: input.userData,
  };

  const { server } = await hetznerFetch<CreateServerResponse>("/servers", {
    body: JSON.stringify(body),
    method: "POST",
  });

  return server;
};

export const getServer = async (id: number): Promise<HetznerServer | null> => {
  try {
    const { server } = await hetznerFetch<{ server: HetznerServer }>(`/servers/${id}`);
    return server;
  } catch (error) {
    if (error instanceof HetznerApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const deleteServer = async (id: number): Promise<void> => {
  await hetznerFetch<{ action: { id: number } }>(`/servers/${id}`, {
    method: "DELETE",
  });
};

export const powerOnServer = async (id: number): Promise<void> => {
  await hetznerFetch(`/servers/${id}/actions/poweron`, { method: "POST" });
};

export const powerOffServer = async (id: number): Promise<void> => {
  await hetznerFetch(`/servers/${id}/actions/poweroff`, { method: "POST" });
};

export const rebootServer = async (id: number): Promise<void> => {
  await hetznerFetch(`/servers/${id}/actions/reboot`, { method: "POST" });
};

interface HetznerLocationInfo {
  id: number;
  name: string;
  description: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  network_zone: string;
}

interface HetznerServerTypePrice {
  location: string;
  price_monthly: { gross: string };
}

export interface HetznerServerType {
  id: number;
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  cpu_type: "shared" | "dedicated";
  architecture: "x86" | "arm";
  deprecated: boolean | null;
  prices: HetznerServerTypePrice[];
}

export interface HetznerDatacenter {
  id: number;
  name: string;
  location: HetznerLocationInfo;
  server_types: {
    supported: number[];
    available: number[];
    available_for_migration: number[];
  };
}

export interface HetznerImage {
  id: number;
  architecture: "x86" | "arm";
  status: string;
}

export const listServerTypes = async (): Promise<HetznerServerType[]> => {
  const { server_types } = await hetznerFetch<{
    server_types: HetznerServerType[];
  }>("/server_types?per_page=50", { next: { revalidate: 60 } });
  return server_types;
};

export const listDatacenters = async (): Promise<HetznerDatacenter[]> => {
  const { datacenters } = await hetznerFetch<{
    datacenters: HetznerDatacenter[];
  }>("/datacenters", { next: { revalidate: 60 } });
  return datacenters;
};

export const getImage = async (id: number | string): Promise<HetznerImage> => {
  const { image } = await hetznerFetch<{ image: HetznerImage }>(`/images/${id}`, {
    next: { revalidate: 3600 },
  });
  return image;
};

export const getPricingCurrency = async (): Promise<string> => {
  const { pricing } = await hetznerFetch<{ pricing: { currency: string } }>("/pricing", {
    next: { revalidate: 86_400 },
  });
  return pricing.currency;
};

export type { HetznerServer };
