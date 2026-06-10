import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { MinecraftSettings } from "./settings";

export const dockerImage = "itzg/minecraft-server:latest";

export const buildMinecraftCompose = (
  config: ComposeConfig,
  settings: MinecraftSettings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  // Give the JVM ~75% of the machine, leaving headroom for the OS and
  // container runtime. Falls back to the heap for the smallest supported
  // machine (8GB) when the machine size is unknown.
  const heapGb = config.memoryGb
    ? Math.max(1, Math.floor(config.memoryGb * 0.75))
    : 6;
  return `services:
  minecraft:
    image: ${dockerImage}
    container_name: ghost-game
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      SERVER_NAME: "${escape(config.name)}"
      MOTD: "${escape(config.name)} - Powered by Ghost"
      DIFFICULTY: "${settings.difficulty}"
      MODE: "${settings.mode}"
      MEMORY: "${heapGb}G"
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
    restart: unless-stopped
`;
};
