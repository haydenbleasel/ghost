import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

import { AccountPanel } from "./_components/account-panel";
import { HetznerPanel } from "./_components/hetzner-panel";
import { PasskeysPanel } from "./_components/passkeys-panel";

const AccountPage = async () => {
  const user = await requireUser();
  const creds = await prisma.user.findUnique({
    select: { hetznerImageId: true, hetznerToken: true },
    where: { id: user.id },
  });
  const hetznerConfigured = Boolean(creds?.hetznerToken && creds?.hetznerImageId);

  return (
    <div className="grid gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading font-medium text-2xl tracking-tight">
          Account
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile and password.
        </p>
      </header>
      {!hetznerConfigured ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Add your Hetzner Cloud token and golden snapshot ID below to start
          provisioning servers.
        </div>
      ) : null}
      <AccountPanel
        user={{
          email: user.email,
          emailVerified: user.emailVerified,
          hasImage: Boolean(user.image),
          name: user.name ?? "",
        }}
      />
      <HetznerPanel
        configured={hetznerConfigured}
        imageId={creds?.hetznerImageId ?? null}
      />
      <PasskeysPanel />
    </div>
  );
};

export default AccountPage;
