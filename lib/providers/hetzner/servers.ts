import "server-only";
import type {
  CreateServerInput,
  MetricsQuery,
  ProviderServer,
  ServerResourceId,
  ServerStatus,
} from "../types";
import { throwIfHetznerError } from "./client";
import type { HetznerClient } from "./client";

const SERVER_STATUSES: readonly ServerStatus[] = [
  "initializing",
  "starting",
  "running",
  "stopping",
  "off",
  "deleting",
  "rebuilding",
  "migrating",
  "unknown",
];

const toServerStatus = (status: string): ServerStatus =>
  (SERVER_STATUSES as readonly string[]).includes(status)
    ? (status as ServerStatus)
    : "unknown";

export const createServerOps = (client: HetznerClient) => ({
  createServer: async (input: CreateServerInput): Promise<ProviderServer> => {
    const { data, error, response } = await client.POST("/servers", {
      body: {
        image: input.imageId,
        location: input.location,
        name: input.name,
        public_net: { enable_ipv4: true, enable_ipv6: false },
        server_type: input.serverType,
        start_after_create: true,
        user_data: input.userData,
      },
    });
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
    if (!data?.server) {
      throw new Error("Provider server creation returned no server");
    }
    return {
      id: String(data.server.id),
      ipv4: data.server.public_net.ipv4?.ip ?? null,
      status: toServerStatus(data.server.status),
    };
  },

  deleteServer: async (id: ServerResourceId): Promise<{ deleted: boolean }> => {
    const { error, response } = await client.DELETE("/servers/{id}", {
      params: { path: { id: Number(id) } },
    });
    if (response.status === 404) {
      return { deleted: false };
    }
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
    return { deleted: true };
  },

  getMetrics: async (
    id: ServerResourceId,
    query: MetricsQuery
  ): Promise<{ metrics: unknown }> => {
    const { data, error, response } = await client.GET(
      "/servers/{id}/metrics",
      {
        params: {
          path: { id: Number(id) },
          query: {
            end: query.end,
            start: query.start,
            type: [query.kind],
          },
        },
      }
    );
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
    return { metrics: data?.metrics ?? null };
  },

  getServer: async (id: ServerResourceId): Promise<ProviderServer | null> => {
    const { data, error, response } = await client.GET("/servers/{id}", {
      params: { path: { id: Number(id) } },
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
    if (!data?.server) {
      return null;
    }
    return {
      id: String(data.server.id),
      ipv4: data.server.public_net.ipv4?.ip ?? null,
      status: toServerStatus(data.server.status),
    };
  },

  rescaleServer: async (
    id: ServerResourceId,
    serverType: string
  ): Promise<void> => {
    const { error, response } = await client.POST(
      "/servers/{id}/actions/change_type",
      {
        body: { server_type: serverType, upgrade_disk: false },
        params: { path: { id: Number(id) } },
      }
    );
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
  },

  setBackupsEnabled: async (
    id: ServerResourceId,
    enabled: boolean
  ): Promise<void> => {
    const path = enabled
      ? ("/servers/{id}/actions/enable_backup" as const)
      : ("/servers/{id}/actions/disable_backup" as const);
    const { error, response } = await client.POST(path, {
      params: { path: { id: Number(id) } },
    });
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
  },
});
