import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";

export const buildTerrariaCompose = (config: ComposeConfig): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
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
      AUTOCREATE: "2"
      DIFFICULTY: "1"
      MAXPLAYERS: "16"
      WORLDNAME: "${escape(config.name)}"
      MOTD: "${escape(config.name)} - Powered by Ghost"
      PASSWORD: "${escape(config.rconPassword)}"
      TZ: "${timezone}"
    volumes:
      - /var/lib/ghost/game/data:/world
`;
};
