"use client";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Panel, PanelCard } from "@/components/panel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

import { formatBytes, formatTime } from "./use-server-metrics";
import type { NetworkPoint, RangeKey } from "./use-server-metrics";

const networkConfig = {
  in: { color: "var(--chart-4)", label: "In" },
  out: { color: "var(--chart-5)", label: "Out" },
} satisfies ChartConfig;

interface Props {
  data: NetworkPoint[];
  loading: boolean;
  range: RangeKey;
}

export const NetworkPanel = ({ data, loading, range }: Props) => (
  <Panel title="Network bandwidth">
    <PanelCard className="p-3">
      {loading ? (
        <div className="flex aspect-[8/3] items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      ) : (
        <ChartContainer className="aspect-[8/3]" config={networkConfig}>
          <LineChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(t) => formatTime(t, range)}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              tickFormatter={formatBytes}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    new Date(
                      Number(payload?.[0]?.payload?.t ?? 0)
                    ).toLocaleString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                  formatter={(value, name) => (
                    <span className="flex w-full justify-between gap-2">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium">
                        {formatBytes(Number(value))}
                      </span>
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
    </PanelCard>
  </Panel>
);
