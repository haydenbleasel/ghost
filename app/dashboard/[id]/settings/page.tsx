"use client";
import { useServer } from "../_components/server-context";
import { SettingsPanel } from "../_components/settings-panel";

const SettingsTab = () => {
  const { currency, eligibleTypes, server, updateServer } = useServer();
  return (
    <SettingsPanel
      currency={currency}
      currentServerType={server.serverType}
      eligibleTypes={eligibleTypes}
      observedState={server.observedState}
      onChange={(patch) => updateServer(patch)}
      serverId={server.id}
    />
  );
};

export default SettingsTab;
