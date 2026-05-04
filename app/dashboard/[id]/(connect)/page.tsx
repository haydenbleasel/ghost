"use client";
import { ConnectPanel } from "../components/connect-panel";
import { useServer } from "../components/server-context";

const ConnectTab = () => {
  const { server } = useServer();
  return (
    <ConnectPanel
      game={server.game}
      ipv4={server.ipv4}
      joinPassword={server.joinPassword}
    />
  );
};

export default ConnectTab;
