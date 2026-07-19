"use server";

import { redirect } from "next/navigation";

import {
  clientIp,
  isSignInRateLimited,
  recordSignInFailure,
} from "@/lib/rate-limit";
import { createSession, verifyCredentials } from "@/lib/session";

export type SignInState = { error: string } | null;

export const signIn = async (
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> => {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const ip = await clientIp();
  if (await isSignInRateLimited(ip)) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  if (!verifyCredentials(email, password)) {
    await recordSignInFailure(ip);
    return { error: "Invalid credentials" };
  }

  await createSession();
  redirect("/");
};
