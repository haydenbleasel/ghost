"use client";
import { ActivityStream } from "../components/activity-stream";
import { useServer } from "../components/server-context";

const ActivityTab = () => {
  const { server } = useServer();
  return <ActivityStream serverId={server.id} />;
};

export default ActivityTab;
