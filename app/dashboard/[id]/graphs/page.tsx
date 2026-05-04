"use client";
import { useState } from "react";

import { Panel, PanelCard } from "@/components/panel";

import { CpuPanel } from "../components/cpu-panel";
import { DiskPanel } from "../components/disk-panel";
import { GraphsRangePanel } from "../components/graphs-range-panel";
import { NetworkPanel } from "../components/network-panel";
import { useServer } from "../components/server-context";
import { useServerMetrics } from "../components/use-server-metrics";
import type { RangeKey } from "../components/use-server-metrics";

const GraphsTab = () => {
  const { server } = useServer();
  const [range, setRange] = useState<RangeKey>("1h");
  const { cpu, disk, error, loading, network } = useServerMetrics(
    server.id,
    server.observedState,
    range
  );

  if (server.observedState !== "running") {
    return (
      <Panel>
        <PanelCard className="text-sm text-muted-foreground">
          Metrics are only available while the server is running.
        </PanelCard>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <GraphsRangePanel error={error} onChange={setRange} range={range} />
      <CpuPanel data={cpu} loading={loading} range={range} />
      <DiskPanel data={disk} loading={loading} range={range} />
      <NetworkPanel data={network} loading={loading} range={range} />
    </div>
  );
};

export default GraphsTab;
