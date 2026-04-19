import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { TerrariaSettings } from "./settings";

export const buildTerrariaCompose = (config: ComposeConfig, settings: TerrariaSettings): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const motd = settings.motd || `${config.name} - Powered by Ghost`;
  return `services:
  terraria:
    image: ryshe/terraria:latest
    container_name: ghost-game
    restart: unless-stopped
    stdin_open: true
    tty: true
    ports:
      - "7777:7777/tcp"
      - "7878:7878/tcp"
    environment:
      WORLD_FILENAME: "ghost.wld"
      AUTOCREATE: "${settings.worldSize}"
      DIFFICULTY: "${settings.difficulty}"
      MAXPLAYERS: "${settings.maxPlayers}"
      WORLDNAME: "${escape(config.name)}"
      MOTD: "${escape(motd)}"
      PASSWORD: "${escape(config.rconPassword)}"
      TZ: "${timezone}"
    volumes:
      - /var/lib/ghost/game/data:/world
`;
};
