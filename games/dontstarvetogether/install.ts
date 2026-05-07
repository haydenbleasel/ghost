import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { DontStarveTogetherSettings } from "./settings";

const indentLines = (text: string, spaces: number): string => {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
};

export const buildDontStarveTogetherCompose = (
  config: ComposeConfig,
  settings: DontStarveTogetherSettings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const description = `${config.name} - Powered by Ghost`;
  const clusterIni = `[GAMEPLAY]
game_mode = ${settings.gameMode}
max_players = ${settings.maxPlayers}
pvp = ${settings.pvp}
pause_when_empty = true
[NETWORK]
cluster_name = ${config.name}
cluster_description = ${description}
cluster_password = ${config.joinPassword ?? ""}
cluster_intention = ${settings.intention}
[MISC]
console_enabled = true
[SHARD]
shard_enabled = false`;
  const masterServerIni = `[NETWORK]
server_port = 10999
[SHARD]
is_master = true
[STEAM]
master_server_port = 27018
authentication_port = 8768`;
  return `services:
  init:
    image: alpine:3
    command:
      - sh
      - -c
      - |
        mkdir -p /data/Cluster_1/Master /data/Cluster_1/mods
        cat > /data/Cluster_1/cluster.ini <<'CLUSTERINI'
${indentLines(clusterIni, 8)}
        CLUSTERINI
        cat > /data/Cluster_1/Master/server.ini <<'SERVERINI'
${indentLines(masterServerIni, 8)}
        SERVERINI
        touch /data/Cluster_1/mods/dedicated_server_mods_setup.lua
    volumes:
      - /var/lib/ghost/game/data:/data
  dst:
    image: jamesits/dst-server:latest
    container_name: ghost-game
    restart: unless-stopped
    depends_on:
      init:
        condition: service_completed_successfully
    security_opt:
      - seccomp=unconfined
    sysctls:
      - net.ipv6.conf.all.disable_ipv6=1
      - net.ipv6.conf.default.disable_ipv6=1
    ports:
      - "10999:10999/udp"
    environment:
      DST_CLUSTER_TOKEN: "${escape(settings.clusterToken)}"
      TZ: "${timezone}"
    volumes:
      - /var/lib/ghost/game/data:/data
`;
};
