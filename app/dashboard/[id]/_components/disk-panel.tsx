"use client";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Panel, PanelCard } from "@/components/panel";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { formatBytes, formatTime } from "./use-server-metrics";
import type { DiskPoint, RangeKey } from "./use-server-metrics";

const diskConfig = {
  read: { color: "var(--chart-2)", label: "Read" },
  write: { color: "var(--chart-3)", label: "Write" },
} satisfies ChartConfig;

interface Props {
  data: DiskPoint[];
  loading: boolean;
  range: RangeKey;
}

export const DiskPanel = ({ data, loading, range }: Props) => (
  <Panel title="Disk bandwidth">
    <PanelCard className="p-3">
      {loading ? (
        <div className="flex aspect-[8/3] items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      ) : (
        <ChartContainer className="aspect-[8/3]" config={diskConfig}>
          <LineChart data={data}>
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
    </PanelCard>
  </Panel>
);
