import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";

export const buildMinecraftCompose = (config: ComposeConfig): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  return `services:
  minecraft:
    image: itzg/minecraft-server:latest
    container_name: ghost-game
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      SERVER_NAME: "${escape(config.name)}"
      MOTD: "${escape(config.name)} - Powered by Ghost"
      DIFFICULTY: "normal"
      MODE: "survival"
      MEMORY: "6G"
      TZ: "${timezone}"
      ENABLE_RCON: "true"
      RCON_PASSWORD: "${escape(config.rconPassword)}"
      OVERRIDE_SERVER_PROPERTIES: "true"
      ENABLE_COMMAND_BLOCK: "true"
      SPAWN_PROTECTION: "0"
      MAX_PLAYERS: "20"
      ALLOW_NETHER: "true"
      ONLINE_MODE: "true"
      VIEW_DISTANCE: "10"
    volumes:
      - /var/lib/ghost/game/data:/data
      - /var/lib/ghost/game/backups:/backups
    restart: unless-stopped
`;
};
