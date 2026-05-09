import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { L4d2Settings } from "./settings";

export const dockerImage = "ghcr.io/wolveix/sourceserver:latest";

export const buildL4d2Compose = (
  config: ComposeConfig,
  settings: L4d2Settings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const serverPassword = config.joinPassword ?? "";
  const extraCfg = `mp_gamemode ${settings.gameMode}; z_difficulty ${settings.difficulty}`;
  return `services:
  init:
    image: alpine:3
    command: chown -R 1000:1000 /home/steam/server
    volumes:
      - /var/lib/ghost/game/data:/home/steam/server
  l4d2:
    image: ${dockerImage}
    container_name: ghost-game
    restart: unless-stopped
    depends_on:
      init:
        condition: service_completed_successfully
    ports:
      - "27015:27015/udp"
      - "27015:27015/tcp"
      - "27020:27020/udp"
    environment:
      TZ: "${timezone}"
      GAME: "left4dead2"
      SRCDS_TOKEN: "${escape(settings.steamToken)}"
      SRCDS_HOSTNAME: "${escape(config.name)}"
      SRCDS_PW: "${escape(serverPassword)}"
      SRCDS_RCONPW: "${escape(config.rconPassword)}"
      SRCDS_PORT: "27015"
      SRCDS_TV_PORT: "27020"
      SRCDS_MAXPLAYERS: "${settings.maxPlayers}"
      SRCDS_STARTMAP: "${settings.startMap}"
      SRCDS_CFG: "${escape(extraCfg)}"
    volumes:
      - /var/lib/ghost/game/data:/home/steam/server
`;
};
