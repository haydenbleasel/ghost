import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { VrisingSettings } from "./settings";

export const buildVrisingCompose = (
  config: ComposeConfig,
  settings: VrisingSettings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const listed = settings.public ? "true" : "false";
  return `services:
  vrising:
    image: trueosiris/vrising:latest
    container_name: ghost-game
    hostname: ghost-game
    restart: unless-stopped
    stop_grace_period: 90s
    security_opt:
      - seccomp=unconfined
    sysctls:
      - net.ipv6.conf.all.disable_ipv6=1
      - net.ipv6.conf.default.disable_ipv6=1
    ports:
      - "9876:9876/udp"
      - "9877:9877/udp"
    environment:
      TZ: "${timezone}"
      SERVERNAME: "${escape(config.name)}"
      WORLDNAME: "${escape(settings.saveName)}"
      GAMEPORT: "9876"
      QUERYPORT: "9877"
      HOST_SETTINGS_Password: "${escape(config.joinPassword ?? "")}"
      HOST_SETTINGS_MaxConnectedUsers: "${settings.maxPlayers}"
      HOST_SETTINGS_ListOnSteam: "${listed}"
      HOST_SETTINGS_ListOnEOS: "${listed}"
      HOST_SETTINGS_Rcon__Enabled: "true"
      HOST_SETTINGS_Rcon__Password: "${escape(config.rconPassword)}"
      GAME_SETTINGS_Preset: "${settings.gameSettingsPreset}"
    volumes:
      - /var/lib/ghost/game/data/server:/mnt/vrising/server
      - /var/lib/ghost/game/data/persistent:/mnt/vrising/persistentdata
`;
};
