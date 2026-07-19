import "server-only";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

import { MissingProviderCredentialsError } from "./errors";
import { createHetznerProvider } from "./hetzner";
import type { Provider, ProviderId } from "./types";

const buildProvider = (provider: ProviderId, token: string): Provider => {
  switch (provider) {
    case "hetzner": {
      return createHetznerProvider(token);
    }
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${_exhaustive as string}`);
    }
  }
};

// Used by management paths (rescale, metrics, backups, delete) that only need
// to talk to the provider. They don't care which golden image exists.
export const getProvider = (): Provider =>
  buildProvider("hetzner", env.HETZNER_API_TOKEN);

// Used by creation paths that boot a VM from the golden image. The image is
// scoped per deployment environment so a snapshot built on a preview
// deployment can't be used to boot a production VM (and vice versa). Throws
// MissingProviderCredentialsError when no snapshot has been built yet.
export const getProviderWithImage = async (
  environment: string
): Promise<{ provider: Provider; imageId: string }> => {
  const snapshot = await prisma.snapshot.findUnique({
    select: { providerImageId: true },
    where: { environment },
  });
  if (!snapshot?.providerImageId) {
    throw new MissingProviderCredentialsError();
  }
  return {
    imageId: snapshot.providerImageId,
    provider: getProvider(),
  };
};

export {
  MissingProviderCredentialsError,
  ProviderApiError,
  formatProviderError,
} from "./errors";
export type {
  Catalog,
  CatalogLocation,
  CatalogServerType,
  CreateServerInput,
  CredentialValidationResult,
  ImageResourceId,
  MetricKind,
  MetricsQuery,
  Provider,
  ProviderId,
  ProviderImage,
  ProviderImageStatus,
  ProviderImageType,
  ProviderServer,
  ServerResourceId,
  ServerStatus,
} from "./types";
