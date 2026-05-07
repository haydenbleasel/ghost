import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { Cs2Settings } from "./settings";

export const buildCs2Compose = (
  config: ComposeConfig,
  settings: Cs2Settings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const serverPassword = config.joinPassword ?? "";
  return `services:
  init:
    image: alpine:3
    command: chown -R 1000:1000 /home/steam/cs2-dedicated
    volumes:
      - /var/lib/ghost/game/data:/home/steam/cs2-dedicated
  cs2:
    image: joedwards32/cs2:latest
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
      SRCDS_TOKEN: "${escape(settings.steamToken)}"
      CS2_SERVERNAME: "${escape(config.name)}"
      CS2_PW: "${escape(serverPassword)}"
      CS2_RCONPW: "${escape(config.rconPassword)}"
      CS2_PORT: "27015"
      CS2_RCON_PORT: "27015"
      CS2_MAXPLAYERS: "${settings.maxPlayers}"
      CS2_GAMEALIAS: "${settings.gameAlias}"
      CS2_STARTMAP: "${settings.startMap}"
      CS2_BOT_QUOTA: "${settings.botQuota}"
      CS2_BOT_DIFFICULTY: "${settings.botDifficulty}"
      TV_PORT: "27020"
      TV_AUTORECORD: "0"
      CS2_LAN: "${settings.lan ? 1 : 0}"
    volumes:
      - /var/lib/ghost/game/data:/home/steam/cs2-dedicated
`;
};
