import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";

export const buildPalworldCompose = (config: ComposeConfig): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
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
      PLAYERS: "16"
      MULTITHREADING: "true"
      COMMUNITY: "true"
      RCON_ENABLED: "true"
      RCON_PORT: "25575"
      TZ: "${timezone}"
      ADMIN_PASSWORD: "${escape(config.rconPassword)}"
      SERVER_PASSWORD: "${escape(config.rconPassword)}"
      SERVER_NAME: "${escape(config.name)}"
      SERVER_DESCRIPTION: "${escape(config.name)} - Powered by Ghost"
    volumes:
      - /var/lib/ghost/game/data:/palworld
    ulimits:
      nofile:
        hard: 65536
        soft: 65536
`;
};
