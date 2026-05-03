export interface ComposeConfig {
  name: string;
  rconPassword: string;
  timezone?: string;
}

export interface GamePort {
  from: number;
  to: number;
  protocol: "tcp" | "udp";
}

export const GAME_CONTAINER_NAME = "ghost-game";

export const escapeComposeValue = (value: string): string =>
  value.replaceAll('"', '\\"');

const formatRange = (port: GamePort): string =>
  port.from === port.to ? `${port.from}` : `${port.from}:${port.to}`;

export const buildUfwRules = (ports: readonly GamePort[]): string[] =>
  ports.map(
    (port) => `ufw allow ${formatRange(port)}/${port.protocol} || true`
  );
