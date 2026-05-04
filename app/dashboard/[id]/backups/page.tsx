"use client";
import { BackupsPanel } from "../components/backups-panel";
import { useServer } from "../components/server-context";

const BackupsTab = () => {
  const { server, updateServer } = useServer();
  return (
    <BackupsPanel
      backupsEnabled={server.backupsEnabled}
      onBackupsChange={(enabled) => updateServer({ backupsEnabled: enabled })}
      serverId={server.id}
    />
  );
};

export default BackupsTab;
