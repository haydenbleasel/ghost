import type { ComposeConfig } from "../compose";
import { escapeComposeValue } from "../compose";
import type { L4d2Settings } from "./settings";

export const dockerImage = "left4devops/l4d2:latest";

export const buildL4d2Compose = (
  config: ComposeConfig,
  settings: L4d2Settings
): string => {
  const timezone = config.timezone ?? "UTC";
  const escape = escapeComposeValue;
  const serverPassword = config.joinPassword ?? "";
  // The image's env-var contract covers hostname, rcon, map, mode, port, lan.
  // Max players, join password, difficulty, and the GSLT are passed as srcds
  // cvars via EXTRA_ARGS. Ghost-generated passwords are slug/hex strings
  // without shell metacharacters.
  const extraArgs: string[] = [
    `+maxplayers ${settings.maxPlayers}`,
    `+sv_password "${escape(serverPassword)}"`,
    `+z_difficulty ${settings.difficulty}`,
  ];
  if (settings.steamToken.length > 0) {
    extraArgs.push(`+sv_setsteamaccount "${escape(settings.steamToken)}"`);
  }
  // Intentionally omit the LAN env var: the image's entrypoint enables
  // `+sv_lan 1` for any non-empty value (including "false"), which makes the
  // server silently drop public clients after the Steam handshake.
  return `services:
  l4d2:
    image: ${dockerImage}
    container_name: ghost-game
    restart: unless-stopped
    ports:
      - "27015:27015/udp"
      - "27015:27015/tcp"
    environment:
      TZ: "${timezone}"
      HOSTNAME: "${escape(config.name)}"
      RCON_PASSWORD: "${escape(config.rconPassword)}"
      PORT: "27015"
      DEFAULT_MAP: "${settings.startMap}"
      DEFAULT_MODE: "${settings.gameMode}"
      EXTRA_ARGS: "${escape(extraArgs.join(" "))}"
`;
};
