import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { RustSettings } from "./settings";

export const buildRustCompose = (
  config: ComposeConfig,
  settings: RustSettings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const description =
    settings.description || `${config.name} - Powered by Ghost`;
  return `services:
  init:
    image: alpine:3
    command: chown -R 10001:10001 /srv/rust/server/ghost
    volumes:
      - /var/lib/ghost/game/data:/srv/rust/server/ghost
  rust:
    image: pfeiffermax/rust-game-server:latest
    container_name: ghost-game
    restart: unless-stopped
    security_opt:
      - seccomp=unconfined
    sysctls:
      - net.ipv6.conf.all.disable_ipv6=1
      - net.ipv6.conf.default.disable_ipv6=1
    depends_on:
      init:
        condition: service_completed_successfully
    ports:
      - "28015:28015/udp"
      - "28016:28016/tcp"
      - "28017:28017/udp"
    environment:
      TZ: "${timezone}"
    command:
      - "+server.ip"
      - "0.0.0.0"
      - "+server.port"
      - "28015"
      - "+server.hostname"
      - "${escape(config.name)}"
      - "+server.description"
      - "${escape(description)}"
      - "+server.maxplayers"
      - "${settings.maxPlayers}"
      - "+server.worldsize"
      - "${settings.worldSize}"
      - "+server.seed"
      - "${settings.seed}"
      - "+server.queryport"
      - "28017"
      - "+rcon.ip"
      - "0.0.0.0"
      - "+rcon.port"
      - "28016"
      - "+rcon.password"
      - "${escape(config.rconPassword)}"
      - "+rcon.web"
      - "${settings.rconWeb ? 1 : 0}"
      - "+server.identity"
      - "ghost"
    volumes:
      - /var/lib/ghost/game/data:/srv/rust/server/ghost
`;
};
