"use client";
import { Panel, PanelCard } from "@/components/panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RangeKey } from "./use-server-metrics";

interface Props {
  range: RangeKey;
  onChange: (range: RangeKey) => void;
  error: string | null;
}

export const GraphsRangePanel = ({ range, onChange, error }: Props) => (
  <Panel title="Time range">
    <PanelCard className="flex items-center justify-between p-3">
      <span className="text-muted-foreground text-sm">Last {range}</span>
      <Tabs onValueChange={(v) => onChange(v as RangeKey)} value={range}>
        <TabsList>
          <TabsTrigger value="1h">1h</TabsTrigger>
          <TabsTrigger value="6h">6h</TabsTrigger>
          <TabsTrigger value="24h">24h</TabsTrigger>
          <TabsTrigger value="7d">7d</TabsTrigger>
        </TabsList>
      </Tabs>
    </PanelCard>
    {error && <PanelCard className="p-6 text-destructive text-sm">{error}</PanelCard>}
  </Panel>
);
