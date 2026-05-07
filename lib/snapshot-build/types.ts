export type SnapshotBuildStatus =
  | "pending"
  | "compiling_agent"
  | "creating_vm"
  | "installing"
  | "snapshotting"
  | "ready"
  | "failed";

export interface SnapshotBuildSummary {
  id: string;
  status: SnapshotBuildStatus;
  snapshotId: string | null;
  previousSnapshotId: string | null;
  errorReason: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export const SNAPSHOT_BUILD_PROGRESSION: SnapshotBuildStatus[] = [
  "pending",
  "compiling_agent",
  "creating_vm",
  "installing",
  "snapshotting",
  "ready",
];

export const isTerminalSnapshotStatus = (
  status: SnapshotBuildStatus
): status is "ready" | "failed" => status === "ready" || status === "failed";
