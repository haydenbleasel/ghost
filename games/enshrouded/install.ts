import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { EnshroudedSettings } from "./settings";

export const buildEnshroudedCompose = (
  config: ComposeConfig,
  settings: EnshroudedSettings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  return `services:
  enshrouded:
    image: mornedhels/enshrouded-server:latest
    container_name: ghost-game
    hostname: ghost-game
    restart: unless-stopped
    stop_grace_period: 90s
    security_opt:
      - seccomp=unconfined
    sysctls:
      - net.ipv6.conf.all.disable_ipv6=1
      - net.ipv6.conf.default.disable_ipv6=1
    ports:
      - "15637:15637/udp"
    environment:
      SERVER_NAME: "${escape(config.name)}"
      SERVER_SLOT_COUNT: "${settings.slots}"
      SERVER_ENABLE_VOICE_CHAT: "${settings.voiceChat}"
      SERVER_VOICE_CHAT_MODE: "Proximity"
      SERVER_ROLE_0_NAME: "Players"
      SERVER_ROLE_0_PASSWORD: "${escape(config.joinPassword ?? "")}"
      SERVER_ROLE_0_CAN_ACCESS_INVENTORIES: "true"
      SERVER_ROLE_0_CAN_EDIT_BASE: "true"
      SERVER_ROLE_0_CAN_EXTEND_BASE: "true"
      SERVER_ROLE_0_CAN_EDIT_WORLD: "true"
      UPDATE_CRON: "*/30 * * * *"
      PUID: "4711"
      PGID: "4711"
      TZ: "${timezone}"
    volumes:
      - /var/lib/ghost/game/data:/opt/enshrouded
`;
};
