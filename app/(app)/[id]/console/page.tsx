"use client";
import { LogsStream } from "../components/logs-stream";
import { useServer } from "../components/server-context";

const ConsoleTab = () => {
  const { server } = useServer();
  return <LogsStream serverId={server.id} />;
};

export default ConsoleTab;
