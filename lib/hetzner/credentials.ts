import "server-only";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

import {
  createHetznerClient,
  type HetznerClient,
  MissingHetznerCredentialsError,
} from "./index";

export interface HetznerCredentials {
  token: string;
  imageId: string;
}

export const getUserHetznerCredentials = async (
  userId: string
): Promise<HetznerCredentials> => {
  const user = await prisma.user.findUnique({
    select: { hetznerImageId: true, hetznerToken: true },
    where: { id: userId },
  });
  if (!(user?.hetznerToken && user.hetznerImageId)) {
    throw new MissingHetznerCredentialsError();
  }
  return {
    imageId: user.hetznerImageId,
    token: decryptSecret(user.hetznerToken),
  };
};

export interface HetznerContext extends HetznerCredentials {
  client: HetznerClient;
}

export const getUserHetznerContext = async (
  userId: string
): Promise<HetznerContext> => {
  const creds = await getUserHetznerCredentials(userId);
  return { ...creds, client: createHetznerClient(creds.token) };
};
