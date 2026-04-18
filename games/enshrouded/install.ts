import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { EnshroudedSettings } from "./settings";

export const buildEnshroudedCompose = (
  config: ComposeConfig,
  settings: EnshroudedSettings,
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  return `services:
  enshrouded:
    image: sknnr/enshrouded-dedicated-server:latest
    container_name: ghost-game
    restart: unless-stopped
    ports:
      - "15636:15636/udp"
      - "27015:27015/udp"
    environment:
      SERVER_NAME: "${escape(config.name)}"
      SERVER_PASSWORD: "${escape(config.rconPassword)}"
      SERVER_SLOTS: "${settings.slots}"
      VOICE_CHAT_MODE: "${settings.voiceChat ? "proximity" : "none"}"
      GAME_PORT: "15636"
      QUERY_PORT: "27015"
      TZ: "${timezone}"
    volumes:
      - /var/lib/ghost/game/data:/home/steam/enshrouded
`;
};
