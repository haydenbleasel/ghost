"use client";
import { useState } from "react";
import { CpuPanel } from "../_components/cpu-panel";
import { DiskPanel } from "../_components/disk-panel";
import { GraphsRangePanel } from "../_components/graphs-range-panel";
import { NetworkPanel } from "../_components/network-panel";
import { useServer } from "../_components/server-context";
import { type RangeKey, useServerMetrics } from "../_components/use-server-metrics";

const GraphsTab = () => {
  const { server } = useServer();
  const [range, setRange] = useState<RangeKey>("1h");
  const { cpu, disk, error, loading, network } = useServerMetrics(
    server.id,
    server.observedState,
    range,
  );

  if (server.observedState !== "running") {
    return (
      <section className="flex flex-col gap-2 rounded-2xl bg-sidebar p-2">
        <div className="rounded-2xl bg-background p-6 text-sm text-muted-foreground shadow-sm/5">
          Metrics are only available while the server is running.
        </div>
      </section>
    );
  }

  return (
    <>
      <GraphsRangePanel error={error} onChange={setRange} range={range} />
      <CpuPanel data={cpu} loading={loading} range={range} />
      <DiskPanel data={disk} loading={loading} range={range} />
      <NetworkPanel data={network} loading={loading} range={range} />
    </>
  );
};

export default GraphsTab;
