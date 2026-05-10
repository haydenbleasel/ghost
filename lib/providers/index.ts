import "server-only";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

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

const loadCredentials = async (
  userId: string
): Promise<{ provider: ProviderId; token: string }> => {
  const user = await prisma.user.findUnique({
    select: { provider: true, providerToken: true },
    where: { id: userId },
  });
  if (!user?.providerToken) {
    throw new MissingProviderCredentialsError();
  }
  return {
    provider: user.provider as ProviderId,
    token: decryptSecret(user.providerToken),
  };
};

// Used by management paths (rescale, metrics, backups, delete) that only need
// to talk to the provider. They don't care which golden image the user has.
export const getProviderForUser = async (userId: string): Promise<Provider> => {
  const { provider, token } = await loadCredentials(userId);
  return buildProvider(provider, token);
};

// Used by creation paths that boot a VM from the user's golden image. The
// image is scoped per deployment environment so a snapshot built on a preview
// deployment can't be used to boot a production VM (and vice versa).
export const getProviderForUserWithImage = async (
  userId: string,
  environment: string
): Promise<{ provider: Provider; imageId: string }> => {
  const [creds, snapshot] = await Promise.all([
    loadCredentials(userId),
    prisma.userSnapshot.findUnique({
      select: { providerImageId: true },
      where: { userId_environment: { environment, userId } },
    }),
  ]);
  if (!snapshot?.providerImageId) {
    throw new MissingProviderCredentialsError();
  }
  return {
    imageId: snapshot.providerImageId,
    provider: buildProvider(creds.provider, creds.token),
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
