import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { ValheimSettings } from "./settings";

export const buildValheimCompose = (config: ComposeConfig, settings: ValheimSettings): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const serverArgs = settings.crossplay ? "-crossplay" : "";
  return `services:
  valheim:
    image: lloesche/valheim-server:latest
    container_name: ghost-game
    cap_add:
      - sys_nice
    ports:
      - "2456-2458:2456-2458/udp"
    environment:
      SERVER_NAME: "${escape(config.name)}"
      WORLD_NAME: "${escape(settings.worldName)}"
      SERVER_PASS: "${escape(config.rconPassword)}"
      SERVER_PUBLIC: "${settings.public}"
      SERVER_ARGS: "${serverArgs}"
      BACKUPS_DIRECTORY: "/config/backups"
      TZ: "${timezone}"
    volumes:
      - /var/lib/ghost/game/data/config:/config
      - /var/lib/ghost/game/backups:/config/backups
    restart: unless-stopped
`;
};
