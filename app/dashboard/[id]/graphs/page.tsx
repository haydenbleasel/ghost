"use client";
import { GraphsPanel } from "../_components/graphs-panel";
import { useServer } from "../_components/server-context";

const GraphsTab = () => {
  const { server } = useServer();
  return <GraphsPanel observedState={server.observedState} serverId={server.id} />;
};

export default GraphsTab;
