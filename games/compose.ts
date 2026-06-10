export interface ComposeConfig {
  name: string;
  rconPassword: string;
  joinPassword: string | null;
  timezone?: string;
  /** Machine memory in GB, when known; games can size heaps/caches from it. */
  memoryGb?: number | null;
}

export interface GamePort {
  from: number;
  to: number;
  protocol: "tcp" | "udp";
}

export const GAME_CONTAINER_NAME = "ghost-game";

// Values land inside YAML double-quoted scalars, where `\` is the escape
// character: backslashes must be escaped before quotes (a raw `\"` in the
// input would otherwise terminate the scalar early), and control characters
// (newlines especially) are stripped so user input can't inject YAML lines.
export const escapeComposeValue = (value: string): string =>
  value
    .replaceAll(/\p{Cc}/gu, "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');

const formatRange = (port: GamePort): string =>
  port.from === port.to ? `${port.from}` : `${port.from}:${port.to}`;

export const buildUfwRules = (ports: readonly GamePort[]): string[] =>
  ports.map(
    (port) => `ufw allow ${formatRange(port)}/${port.protocol} || true`
  );
