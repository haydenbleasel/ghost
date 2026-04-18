import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { MinecraftSettings } from "./settings";

export const buildMinecraftCompose = (
  config: ComposeConfig,
  settings: MinecraftSettings,
): string => {
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
      DIFFICULTY: "${settings.difficulty}"
      MODE: "${settings.mode}"
      MEMORY: "6G"
      TZ: "${timezone}"
      ENABLE_RCON: "true"
      RCON_PASSWORD: "${escape(config.rconPassword)}"
      OVERRIDE_SERVER_PROPERTIES: "true"
      ENABLE_COMMAND_BLOCK: "${settings.enableCommandBlock}"
      SPAWN_PROTECTION: "${settings.spawnProtection}"
      MAX_PLAYERS: "${settings.maxPlayers}"
      ALLOW_NETHER: "${settings.allowNether}"
      ONLINE_MODE: "${settings.onlineMode}"
      PVP: "${settings.pvp}"
      VIEW_DISTANCE: "${settings.viewDistance}"
    volumes:
      - /var/lib/ghost/game/data:/data
      - /var/lib/ghost/game/backups:/backups
    restart: unless-stopped
`;
};
