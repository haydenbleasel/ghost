"use client";
import { ActivityStream } from "../_components/activity-stream";
import { useServer } from "../_components/server-context";

const ActivityTab = () => {
  const { server } = useServer();
  return <ActivityStream serverId={server.id} />;
};

export default ActivityTab;
