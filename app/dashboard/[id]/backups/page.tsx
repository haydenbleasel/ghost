"use client";
import { BackupsPanel } from "../_components/backups-panel";
import { useServer } from "../_components/server-context";

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
