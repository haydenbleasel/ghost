"use client";
import { useEffect, useState } from "react";

interface Series {
  values: [number, string][];
}
interface MetricsPayload {
  metrics: {
    start: string;
    end: string;
    step: number;
    time_series: Record<string, Series>;
  } | null;
}

export const RANGES = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
} as const;
export type RangeKey = keyof typeof RANGES;

const pointsFor = (
  series: Series | undefined,
  scale: (n: number) => number = (n) => n
): { t: number; v: number }[] => {
  if (!series) {
    return [];
  }
  return series.values.map(([ts, value]) => ({
    t: ts * 1000,
    v: scale(Number(value)),
  }));
};

const zip = <K extends string>(
  named: Record<K, { t: number; v: number }[]>
): (Record<K, number> & { t: number })[] => {
  const byTime = new Map<number, Record<string, number>>();
  for (const [key, points] of Object.entries(named) as [
    K,
    { t: number; v: number }[],
  ][]) {
    for (const { t, v } of points) {
      const row = byTime.get(t) ?? {};
      row[key] = v;
      byTime.set(t, row);
    }
  }
  return [...byTime.entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([t, row]) => ({ t, ...row }) as Record<K, number> & { t: number });
};

export const formatTime = (ms: number, rangeKey: RangeKey): string => {
  const d = new Date(ms);
  if (rangeKey === "1h" || rangeKey === "6h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (rangeKey === "24h") {
    return d.toLocaleTimeString([], { hour: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
};

export const formatBytes = (n: number): string => {
  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(1)} GB/s`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(1)} MB/s`;
  }
  if (n >= 1e3) {
    return `${(n / 1e3).toFixed(1)} KB/s`;
  }
  return `${n.toFixed(0)} B/s`;
};

export interface CpuPoint {
  t: number;
  cpu: number;
}
export interface DiskPoint {
  t: number;
  read: number;
  write: number;
}
export interface NetworkPoint {
  t: number;
  in: number;
  out: number;
}

export const useServerMetrics = (
  serverId: string,
  observedState: string,
  range: RangeKey
) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cpu, setCpu] = useState<CpuPoint[]>([]);
  const [disk, setDisk] = useState<DiskPoint[]>([]);
  const [network, setNetwork] = useState<NetworkPoint[]>([]);

  useEffect(() => {
    if (observedState !== "running") {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const end = new Date();
    const start = new Date(end.getTime() - RANGES[range]);
    const qs = (type: string) =>
      `type=${type}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cpuRes, diskRes, netRes] = await Promise.all([
          fetch(`/api/servers/${serverId}/metrics?${qs("cpu")}`, {
            signal: controller.signal,
          }),
          fetch(`/api/servers/${serverId}/metrics?${qs("disk")}`, {
            signal: controller.signal,
          }),
          fetch(`/api/servers/${serverId}/metrics?${qs("network")}`, {
            signal: controller.signal,
          }),
        ]);
        if (!(cpuRes.ok && diskRes.ok && netRes.ok)) {
          setError("Failed to load metrics");
          return;
        }
        const [cpuJson, diskJson, netJson]: MetricsPayload[] =
          await Promise.all([cpuRes.json(), diskRes.json(), netRes.json()]);

        setCpu(
          zip({
            cpu: pointsFor(cpuJson.metrics?.time_series.cpu),
          })
        );
        setDisk(
          zip({
            read: pointsFor(
              diskJson.metrics?.time_series["disk.0.bandwidth.read"]
            ),
            write: pointsFor(
              diskJson.metrics?.time_series["disk.0.bandwidth.write"]
            ),
          })
        );
        setNetwork(
          zip({
            in: pointsFor(
              netJson.metrics?.time_series["network.0.bandwidth.in"]
            ),
            out: pointsFor(
              netJson.metrics?.time_series["network.0.bandwidth.out"]
            ),
          })
        );
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError("Failed to load metrics");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [serverId, range, observedState]);

  return { cpu, disk, error, loading, network };
};
