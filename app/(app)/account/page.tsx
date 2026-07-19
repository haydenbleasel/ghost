import { prisma } from "@/lib/db";
import { SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { requireUser } from "@/lib/session";
import type { SnapshotBuildSummary } from "@/lib/snapshot-build/types";

import { PageBody } from "../components/page-header";
import { SnapshotPanel } from "./components/snapshot-panel";

const AccountPage = async () => {
  await requireUser();
  const [snapshot, latestBuildRow] = await Promise.all([
    prisma.snapshot.findUnique({
      select: { providerImageId: true },
      where: { environment: SNAPSHOT_ENVIRONMENT },
    }),
    prisma.snapshotBuild.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        errorReason: true,
        finishedAt: true,
        id: true,
        previousSnapshotId: true,
        snapshotId: true,
        status: true,
      },
    }),
  ]);
  const configured = Boolean(snapshot?.providerImageId);
  const latestBuild: SnapshotBuildSummary | null = latestBuildRow
    ? {
        createdAt: latestBuildRow.createdAt.toISOString(),
        errorReason: latestBuildRow.errorReason,
        finishedAt: latestBuildRow.finishedAt?.toISOString() ?? null,
        id: latestBuildRow.id,
        previousSnapshotId: latestBuildRow.previousSnapshotId,
        snapshotId: latestBuildRow.snapshotId,
        status: latestBuildRow.status,
      }
    : null;

  return (
    <PageBody>
      <div className="grid gap-8">
        {configured ? null : (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            Click <strong>Build snapshot</strong> to create your golden image.
            Servers can&apos;t be provisioned until it&apos;s ready.
          </div>
        )}
        <SnapshotPanel
          configured={configured}
          imageId={snapshot?.providerImageId ?? null}
          latestBuild={latestBuild}
        />
      </div>
    </PageBody>
  );
};

export default AccountPage;
