import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { SatisfactorySettings } from "./settings";

export const buildSatisfactoryCompose = (
  config: ComposeConfig,
  settings: SatisfactorySettings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  return `services:
  satisfactory:
    image: wolveix/satisfactory-server:latest
    container_name: ghost-game
    hostname: ghost-game
    restart: unless-stopped
    stop_grace_period: 30s
    security_opt:
      - seccomp=unconfined
    sysctls:
      - net.ipv6.conf.all.disable_ipv6=1
      - net.ipv6.conf.default.disable_ipv6=1
    ports:
      - "7777:7777/udp"
      - "7777:7777/tcp"
    environment:
      PUID: "1000"
      PGID: "1000"
      MAXPLAYERS: "${settings.maxPlayers}"
      AUTOPAUSE: "${settings.autoPause}"
      AUTOSAVEINTERVAL: "${settings.autoSaveInterval}"
      AUTOSAVEONDISCONNECT: "${settings.autoSaveOnDisconnect}"
      DISABLESEASONALEVENTS: "${settings.disableSeasonalEvents}"
      SERVERGAMEPORT: "7777"
      SERVERIP: "0.0.0.0"
      SKIPUPDATE: "false"
      STEAMBETA: "false"
      ADMINPASSWORD: "${escape(config.rconPassword)}"
      TZ: "${timezone}"
      TIMEZONE: "${timezone}"
    volumes:
      - /var/lib/ghost/game/data:/config
`;
};
