"use client";
import { ConnectPanel } from "../_components/connect-panel";
import { useServer } from "../_components/server-context";

const ConnectTab = () => {
  const { server } = useServer();
  return <ConnectPanel game={server.game} ipv4={server.ipv4} />;
};

export default ConnectTab;
