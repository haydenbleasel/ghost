"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RangeKey } from "./use-server-metrics";

interface Props {
  range: RangeKey;
  onChange: (range: RangeKey) => void;
  error: string | null;
}

export const GraphsRangePanel = ({ range, onChange, error }: Props) => (
  <section className="flex flex-col gap-2 rounded-2xl bg-sidebar p-2">
    <div className="px-4 pt-2 pb-1">
      <h2 className="text-sm font-medium text-muted-foreground">Time range</h2>
    </div>
    <div className="flex items-center justify-between rounded-2xl bg-background p-3 shadow-sm/5">
      <span className="text-muted-foreground text-sm">Last {range}</span>
      <Tabs onValueChange={(v) => onChange(v as RangeKey)} value={range}>
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
  </section>
);
