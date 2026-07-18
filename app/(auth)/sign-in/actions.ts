"use server";

import { redirect } from "next/navigation";

import { createSession, verifyCredentials } from "@/lib/session";

export type SignInState = { error: string } | null;

export const signIn = async (
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> => {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!verifyCredentials(email, password)) {
    return { error: "Invalid credentials" };
  }

  await createSession();
  redirect("/");
};
