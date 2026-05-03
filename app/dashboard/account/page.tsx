import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

import { PageBody, PageHeader } from "../_components/page-header";
import { AccountPanel } from "./_components/account-panel";
import { HetznerPanel } from "./_components/hetzner-panel";
import { PasskeysPanel } from "./_components/passkeys-panel";

const AccountPage = async () => {
  const user = await requireUser();
  const creds = await prisma.user.findUnique({
    select: { hetznerImageId: true, hetznerToken: true },
    where: { id: user.id },
  });
  const hetznerConfigured = Boolean(
    creds?.hetznerToken && creds?.hetznerImageId
  );

  return (
    <>
      <PageHeader title="Account" />
      <PageBody>
        <div className="grid gap-8">
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
      </PageBody>
    </>
  );
};

export default AccountPage;
