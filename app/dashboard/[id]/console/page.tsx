"use client";
import { LogsStream } from "../_components/logs-stream";
import { useServer } from "../_components/server-context";

const ConsoleTab = () => {
  const { server } = useServer();
  return <LogsStream serverId={server.id} />;
};

export default ConsoleTab;
