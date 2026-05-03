"use client";
import { FingerprintIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn } from "@/lib/auth-client";

const SignInPage = () => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const autofillStarted = useRef(false);

  useEffect(() => {
    if (autofillStarted.current) {
      return;
    }
    autofillStarted.current = true;
    const run = async () => {
      try {
        const result = await authClient.signIn.passkey({ autoFill: true });
        if (result?.error || !result?.data) {
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } catch {
        // autofill is best-effort; ignore failures
      }
    };
    run();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const { error } = await signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Sign in failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const handlePasskeySignIn = async () => {
    setPasskeyPending(true);
    const result = await authClient.signIn.passkey();
    setPasskeyPending(false);
    if (result?.error) {
      toast.error(result.error.message ?? "Passkey sign in failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username webauthn"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handlePasskeySignIn}
        disabled={passkeyPending}
      >
        <FingerprintIcon />
        {passkeyPending ? "Waiting…" : "Sign in with a passkey"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link className="underline" href="/sign-up">
          Create one
        </Link>
      </p>
    </form>
  );
};

export default SignInPage;
