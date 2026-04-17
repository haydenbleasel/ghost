"use client";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const RANGES = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
} as const;
type RangeKey = keyof typeof RANGES;

const pointsFor = (
  series: Series | undefined,
  scale: (n: number) => number = (n) => n,
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
  named: Record<K, { t: number; v: number }[]>,
): (Record<K, number> & { t: number })[] => {
  const byTime = new Map<number, Record<string, number>>();
  for (const [key, points] of Object.entries(named) as [K, { t: number; v: number }[]][]) {
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

const formatTime = (ms: number, rangeKey: RangeKey): string => {
  const d = new Date(ms);
  if (rangeKey === "1h" || rangeKey === "6h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (rangeKey === "24h") {
    return d.toLocaleTimeString([], { hour: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
};

const formatBytes = (n: number): string => {
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

const cpuConfig = {
  cpu: { color: "var(--chart-1)", label: "CPU %" },
} satisfies ChartConfig;

const diskConfig = {
  read: { color: "var(--chart-2)", label: "Read" },
  write: { color: "var(--chart-3)", label: "Write" },
} satisfies ChartConfig;

const networkConfig = {
  in: { color: "var(--chart-4)", label: "In" },
  out: { color: "var(--chart-5)", label: "Out" },
} satisfies ChartConfig;

interface Props {
  serverId: string;
  observedState: string;
}

export const GraphsPanel = ({ serverId, observedState }: Props) => {
  const [range, setRange] = useState<RangeKey>("1h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cpu, setCpu] = useState<{ t: number; cpu: number }[]>([]);
  const [disk, setDisk] = useState<{ t: number; read: number; write: number }[]>([]);
  const [network, setNetwork] = useState<{ t: number; in: number; out: number }[]>([]);

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
          fetch(`/api/servers/${serverId}/metrics?${qs("cpu")}`, { signal: controller.signal }),
          fetch(`/api/servers/${serverId}/metrics?${qs("disk")}`, { signal: controller.signal }),
          fetch(`/api/servers/${serverId}/metrics?${qs("network")}`, { signal: controller.signal }),
        ]);
        if (!(cpuRes.ok && diskRes.ok && netRes.ok)) {
          setError("Failed to load metrics");
          return;
        }
        const [cpuJson, diskJson, netJson]: MetricsPayload[] = await Promise.all([
          cpuRes.json(),
          diskRes.json(),
          netRes.json(),
        ]);

        setCpu(
          zip({
            cpu: pointsFor(cpuJson.metrics?.time_series.cpu),
          }),
        );
        setDisk(
          zip({
            read: pointsFor(diskJson.metrics?.time_series["disk.0.bandwidth.read"]),
            write: pointsFor(diskJson.metrics?.time_series["disk.0.bandwidth.write"]),
          }),
        );
        setNetwork(
          zip({
            in: pointsFor(netJson.metrics?.time_series["network.0.bandwidth.in"]),
            out: pointsFor(netJson.metrics?.time_series["network.0.bandwidth.out"]),
          }),
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

  if (observedState !== "running") {
    return (
      <section className="flex flex-col gap-2 rounded-2xl bg-sidebar p-2">
        <div className="rounded-2xl bg-background p-6 text-sm text-muted-foreground shadow-sm/5">
          Metrics are only available while the server is running.
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-sidebar p-2">
      <div className="flex items-center justify-between rounded-2xl bg-background p-3 shadow-sm/5">
        <span className="text-muted-foreground text-sm">Last {range}</span>
        <Tabs onValueChange={(v) => setRange(v as RangeKey)} value={range}>
          <TabsList>
            <TabsTrigger value="1h">1h</TabsTrigger>
            <TabsTrigger value="6h">6h</TabsTrigger>
            <TabsTrigger value="24h">24h</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <div className="rounded-2xl bg-background p-6 text-destructive text-sm shadow-sm/5">
          {error}
        </div>
      )}

      <div className="grid gap-2 rounded-2xl bg-background p-3 shadow-sm/5">
        <h3 className="font-medium text-sm">CPU</h3>
        {loading ? (
          <div className="flex aspect-[8/3] items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <ChartContainer className="aspect-[8/3]" config={cpuConfig}>
            <AreaChart data={cpu}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(t) => formatTime(t, range)}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis
                domain={[0, (max: number) => Math.max(100, Math.ceil(max / 100) * 100)]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      new Date(Number(payload?.[0]?.payload?.t ?? 0)).toLocaleString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                    formatter={(value, name) => (
                      <span className="flex w-full justify-between gap-2">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono font-medium">
                          {`${Number(value).toFixed(1)}%`}
                        </span>
                      </span>
                    )}
                  />
                }
              />
              <Area
                dataKey="cpu"
                type="monotone"
                fill="var(--color-cpu)"
                fillOpacity={0.3}
                stroke="var(--color-cpu)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>

      <div className="grid gap-2 rounded-2xl bg-background p-3 shadow-sm/5">
        <h3 className="font-medium text-sm">Disk bandwidth</h3>
        {loading ? (
          <div className="flex aspect-[8/3] items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <ChartContainer className="aspect-[8/3]" config={diskConfig}>
            <LineChart data={disk}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(t) => formatTime(t, range)}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis tickFormatter={formatBytes} tickLine={false} axisLine={false} width={72} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      new Date(Number(payload?.[0]?.payload?.t ?? 0)).toLocaleString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                    formatter={(value, name) => (
                      <span className="flex w-full justify-between gap-2">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono font-medium">{formatBytes(Number(value))}</span>
                      </span>
                    )}
                  />
                }
              />
              <Line
                dataKey="read"
                type="monotone"
                stroke="var(--color-read)"
                dot={false}
                strokeWidth={2}
              />
              <Line
                dataKey="write"
                type="monotone"
                stroke="var(--color-write)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>

      <div className="grid gap-2 rounded-2xl bg-background p-3 shadow-sm/5">
        <h3 className="font-medium text-sm">Network bandwidth</h3>
        {loading ? (
          <div className="flex aspect-[8/3] items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <ChartContainer className="aspect-[8/3]" config={networkConfig}>
            <LineChart data={network}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(t) => formatTime(t, range)}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis tickFormatter={formatBytes} tickLine={false} axisLine={false} width={72} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      new Date(Number(payload?.[0]?.payload?.t ?? 0)).toLocaleString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                    formatter={(value, name) => (
                      <span className="flex w-full justify-between gap-2">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono font-medium">{formatBytes(Number(value))}</span>
                      </span>
                    )}
                  />
                }
              />
              <Line
                dataKey="in"
                type="monotone"
                stroke="var(--color-in)"
                dot={false}
                strokeWidth={2}
              />
              <Line
                dataKey="out"
                type="monotone"
                stroke="var(--color-out)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </section>
  );
};
