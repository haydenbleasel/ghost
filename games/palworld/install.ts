import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { PalworldSettings } from "./settings";

export const buildPalworldCompose = (config: ComposeConfig, settings: PalworldSettings): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const description = settings.description || `${config.name} - Powered by Ghost`;
  return `services:
  palworld:
    image: thijsvanloef/palworld-server-docker:latest
    container_name: ghost-game
    restart: unless-stopped
    ports:
      - "8211:8211/udp"
      - "27015:27015/udp"
      - "25575:25575/tcp"
    environment:
      PUID: "1000"
      PGID: "1000"
      PORT: "8211"
      PLAYERS: "${settings.maxPlayers}"
      MULTITHREADING: "${settings.multithreading}"
      COMMUNITY: "true"
      RCON_ENABLED: "true"
      RCON_PORT: "25575"
      DIFFICULTY: "${settings.difficulty}"
      PVP: "${settings.pvp}"
      TZ: "${timezone}"
      ADMIN_PASSWORD: "${escape(config.rconPassword)}"
      SERVER_PASSWORD: "${escape(config.rconPassword)}"
      SERVER_NAME: "${escape(config.name)}"
      SERVER_DESCRIPTION: "${escape(description)}"
    volumes:
      - /var/lib/ghost/game/data:/palworld
    ulimits:
      nofile:
        hard: 65536
        soft: 65536
`;
};
