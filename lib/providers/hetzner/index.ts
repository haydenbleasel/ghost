import "server-only";
import type {
  BuilderProfile,
  CredentialValidationResult,
  Provider,
} from "../types";
import { getHetznerCatalog } from "./catalog";
import { createHetznerClient } from "./client";
import { createImageOps } from "./images";
import { createServerOps } from "./servers";

export const HETZNER_BUILDER_PROFILE: BuilderProfile = {
  baseImage: "ubuntu-24.04",
  location: "nbg1",
  serverType: "cx23",
};

export const createHetznerProvider = (token: string): Provider => {
  const client = createHetznerClient(token);
  const servers = createServerOps(client);
  const images = createImageOps(client);

  return {
    id: "hetzner",
    ...servers,
    ...images,
    getCatalog: (referenceImageId) =>
      getHetznerCatalog(client, referenceImageId),
    validateCredentials: async (): Promise<CredentialValidationResult> => {
      const { response } = await client.GET("/locations", {
        params: { query: { per_page: 1 } },
      });
      if (response.status === 401) {
        return { ok: false, reason: "unauthorized" };
      }
      if (!response.ok) {
        return { ok: false, reason: "unreachable" };
      }
      return { ok: true };
    },
  };
};
