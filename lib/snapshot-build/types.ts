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

export const SNAPSHOT_BUILD_STEP_LABELS: Record<SnapshotBuildStatus, string> = {
  compiling_agent: "Compiling agent",
  creating_vm: "Creating VM",
  failed: "Failed",
  installing: "Installing",
  pending: "Queued",
  ready: "Ready",
  snapshotting: "Snapshotting",
};

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
