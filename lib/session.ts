import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

export const getSession = async () =>
  auth.api.getSession({ headers: await headers() });

export const requireUser = async () => {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }
  return session.user;
};
