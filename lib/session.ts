import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";

export const getSession = async () => auth.api.getSession({ headers: await headers() });

export const requireUser = async () => {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
};
