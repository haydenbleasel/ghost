import "server-only";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

import { createHetznerClient, MissingHetznerCredentialsError } from "./index";
import type { HetznerClient } from "./index";

export interface HetznerClientContext {
  token: string;
  client: HetznerClient;
}

export interface HetznerImageContext extends HetznerClientContext {
  imageId: string;
}

const loadToken = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    select: { hetznerToken: true },
    where: { id: userId },
  });
  if (!user?.hetznerToken) {
    throw new MissingHetznerCredentialsError();
  }
  return decryptSecret(user.hetznerToken);
};

// Used by management paths (rescale, metrics, backups, delete) that only need
// to talk to Hetzner. They don't care which golden image the user has.
export const getUserHetznerContext = async (
  userId: string
): Promise<HetznerClientContext> => {
  const token = await loadToken(userId);
  return { client: createHetznerClient(token), token };
};

// Used by creation paths that boot a VM from the user's golden image. The
// image is scoped per deployment environment so a snapshot built on a preview
// deployment can't be used to boot a production VM (and vice versa).
export const getUserHetznerImageContext = async (
  userId: string,
  environment: string
): Promise<HetznerImageContext> => {
  const [token, snapshot] = await Promise.all([
    loadToken(userId),
    prisma.userSnapshot.findUnique({
      select: { hetznerImageId: true },
      where: { userId_environment: { environment, userId } },
    }),
  ]);
  if (!snapshot?.hetznerImageId) {
    throw new MissingHetznerCredentialsError();
  }
  return {
    client: createHetznerClient(token),
    imageId: snapshot.hetznerImageId,
    token,
  };
};
