import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { DontStarveTogetherSettings } from "./settings";

export const dockerImage = "webhippie/dst:latest";

export const buildDontStarveTogetherCompose = (
  config: ComposeConfig,
  settings: DontStarveTogetherSettings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const description = `${config.name} - Powered by Ghost`;
  return `services:
  dst:
    image: ${dockerImage}
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
      - "10999:10999/udp"
      - "27017:27017/udp"
      - "8767:8767/udp"
    environment:
      TZ: "${timezone}"
      DST_CLUSTER_TOKEN: "${escape(settings.clusterToken)}"
      DST_NETWORK_CLUSTER_NAME: "${escape(config.name)}"
      DST_NETWORK_CLUSTER_DESCRIPTION: "${escape(description)}"
      DST_NETWORK_CLUSTER_PASSWORD: "${escape(config.joinPassword ?? "")}"
      DST_NETWORK_CLUSTER_INTENTION: "${settings.intention}"
      DST_GAMEPLAY_GAME_MODE: "${settings.gameMode}"
      DST_GAMEPLAY_MAX_PLAYERS: "${settings.maxPlayers}"
      DST_GAMEPLAY_PVP: "${settings.pvp}"
      DST_GAMEPLAY_PAUSE_WHEN_EMPTY: "true"
      DST_MISC_CONSOLE_ENABLED: "true"
      DST_SHARD_IS_MASTER: "true"
      DST_SHARD_ENABLED: "false"
      DST_NETWORK_SERVER_PORT: "10999"
    volumes:
      - /var/lib/ghost/game/data:/var/lib/game
`;
};
