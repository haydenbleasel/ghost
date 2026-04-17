"use client";
import { DetailsPanel } from "../_components/details-panel";
import { useServer } from "../_components/server-context";

const DetailsTab = () => {
  const { server } = useServer();
  return <DetailsPanel location={server.location} specs={server.specs} />;
};

export default DetailsTab;
