import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { TerrariaSettings } from "./settings";

export const dockerImage = "ryshe/terraria:latest";

export const buildTerrariaCompose = (
  config: ComposeConfig,
  settings: TerrariaSettings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const motd = settings.motd || `${config.name} - Powered by Ghost`;
  const passLine = config.joinPassword
    ? `\n      - "-pass"\n      - "${escape(config.joinPassword)}"`
    : "";
  return `services:
  terraria:
    image: ${dockerImage}
    container_name: ghost-game
    restart: unless-stopped
    stdin_open: true
    tty: true
    ports:
      - "7777:7777/tcp"
      - "7878:7878/tcp"
    environment:
      WORLD_FILENAME: "ghost.wld"
      TZ: "${timezone}"
    command:
      - "-autocreate"
      - "${settings.worldSize}"
      - "-difficulty"
      - "${settings.difficulty}"
      - "-maxplayers"
      - "${settings.maxPlayers}"
      - "-worldname"
      - "${escape(config.name)}"
      - "-motd"
      - "${escape(motd)}"${passLine}
    volumes:
      - /var/lib/ghost/game/data:/root/.local/share/Terraria/Worlds
`;
};
