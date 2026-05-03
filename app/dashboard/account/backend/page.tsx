import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { SnapshotBuildSummary } from "@/lib/snapshot-build/types";

import { PageBody } from "../../_components/page-header";
import { HetznerPanel } from "../_components/hetzner-panel";

const BackendPage = async () => {
  const user = await requireUser();
  const [creds, latestBuildRow] = await Promise.all([
    prisma.user.findUnique({
      select: { hetznerImageId: true, hetznerToken: true },
      where: { id: user.id },
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
      where: { userId: user.id },
    }),
  ]);
  const hetznerConfigured = Boolean(
    creds?.hetznerToken && creds?.hetznerImageId
  );
  const tokenSaved = Boolean(creds?.hetznerToken);
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
        {hetznerConfigured ? null : (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            Add your Hetzner Cloud token below, then click{" "}
            <strong>Build snapshot</strong> to create your golden image.
          </div>
        )}
        <HetznerPanel
          configured={hetznerConfigured}
          imageId={creds?.hetznerImageId ?? null}
          latestBuild={latestBuild}
          tokenSaved={tokenSaved}
        />
      </div>
    </PageBody>
  );
};

export default BackendPage;
