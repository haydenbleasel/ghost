import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { VrisingSettings } from "./settings";

export const buildVrisingCompose = (
  config: ComposeConfig,
  settings: VrisingSettings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  return `services:
  vrising:
    image: trueosx/vrising-dedicated:latest
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
      SERVERPASSWORD: "${escape(config.joinPassword ?? "")}"
      RCON_ENABLED: "true"
      RCON_PASSWORD: "${escape(config.rconPassword)}"
      GAMEPORT: "9876"
      QUERYPORT: "9877"
      MAX_USERS: "${settings.maxPlayers}"
      GAME_SETTINGS_PRESET: "${settings.gameSettingsPreset}"
      BIND_PUBLIC: "${settings.public}"
    volumes:
      - /var/lib/ghost/game/data/server:/mnt/vrising/server
      - /var/lib/ghost/game/data/persistent:/mnt/vrising/persistentdata
`;
};
