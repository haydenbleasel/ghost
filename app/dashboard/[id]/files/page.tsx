"use client";
import { FilesPanel } from "../_components/files-panel";
import { useServer } from "../_components/server-context";

const FilesTab = () => {
  const { server } = useServer();
  return <FilesPanel serverId={server.id} />;
};

export default FilesTab;
