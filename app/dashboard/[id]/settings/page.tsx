"use client";
import { getGame, resolveSettings } from "@/games";
import { GameSettingsForm } from "../_components/game-settings-form";
import { useServer } from "../_components/server-context";
import { SettingsPanel } from "../_components/settings-panel";

const SettingsTab = () => {
  const { currency, eligibleTypes, server, updateServer } = useServer();
  const game = getGame(server.game);

  return (
    <div className="grid gap-6">
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
