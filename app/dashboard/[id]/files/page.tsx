"use client";
import { FilesPanel } from "../components/files-panel";
import { useServer } from "../components/server-context";

const FilesTab = () => {
  const { server } = useServer();
  return <FilesPanel serverId={server.id} />;
};

export default FilesTab;
