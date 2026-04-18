import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";

export const buildRustCompose = (config: ComposeConfig): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  return `services:
  rust:
    image: didstopia/rust-server:latest
    container_name: ghost-game
    restart: unless-stopped
    ports:
      - "28015:28015/udp"
      - "28016:28016/tcp"
      - "28082:28082/tcp"
    environment:
      RUST_SERVER_STARTUP_ARGUMENTS: "-batchmode -load -nographics"
      RUST_SERVER_IDENTITY: "ghost"
      RUST_SERVER_NAME: "${escape(config.name)}"
      RUST_SERVER_DESCRIPTION: "${escape(config.name)} - Powered by Ghost"
      RUST_SERVER_MAXPLAYERS: "50"
      RUST_SERVER_WORLDSIZE: "3000"
      RUST_SERVER_SEED: "12345"
      RUST_SERVER_PORT: "28015"
      RUST_RCON_PASSWORD: "${escape(config.rconPassword)}"
      RUST_RCON_PORT: "28016"
      RUST_RCON_WEB: "1"
      TZ: "${timezone}"
    volumes:
      - /var/lib/ghost/game/data:/steamcmd/rust
`;
};
