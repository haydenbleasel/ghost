"use client";
import { getGame, resolveSettings } from "@/games";

import { GameSettingsForm } from "../components/game-settings-form";
import { useServer } from "../components/server-context";
import { SettingsPanel } from "../components/settings-panel";

const SettingsTab = () => {
  const { currency, eligibleTypes, server, updateServer } = useServer();
  const game = getGame(server.game);

  return (
    <div className="flex flex-col gap-3">
      {game && (
        <GameSettingsForm
          initialValues={resolveSettings(game.settings, server.settings)}
          schema={game.settings}
          serverId={server.id}
        />
      )}
      <SettingsPanel
        currency={currency}
        currentServerType={server.serverType}
        eligibleTypes={eligibleTypes}
        observedState={server.observedState}
        onChange={(patch) => updateServer(patch)}
        serverId={server.id}
      />
    </div>
  );
};

export default SettingsTab;
