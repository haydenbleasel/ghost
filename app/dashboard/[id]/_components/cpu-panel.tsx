"use client";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { type CpuPoint, formatTime, type RangeKey } from "./use-server-metrics";

const cpuConfig = {
  cpu: { color: "var(--chart-1)", label: "CPU %" },
} satisfies ChartConfig;

interface Props {
  data: CpuPoint[];
  loading: boolean;
  range: RangeKey;
}

export const CpuPanel = ({ data, loading, range }: Props) => (
  <section className="flex flex-col gap-2 rounded-2xl bg-sidebar p-2">
    <div className="px-4 pt-2 pb-1">
      <h2 className="text-sm font-medium text-muted-foreground">CPU</h2>
    </div>
    <div className="rounded-2xl bg-background p-3 shadow-sm/5">
      {loading ? (
        <div className="flex aspect-[8/3] items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      ) : (
        <ChartContainer className="aspect-[8/3]" config={cpuConfig}>
          <AreaChart data={data}>
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
  </section>
);
