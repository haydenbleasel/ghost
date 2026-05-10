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
  // L4D2's coop/lobby logic wipes cvars set on the command line after the
  // first map load (sv_password is the obvious one). Anything that needs to
  // survive map changes lives in server.cfg, which srcds_run executes on
  // every spawn. The image symlinks /cfg into left4dead2/cfg.
  const serverCfgLines = [
    `sv_password "${serverPassword}"`,
    `z_difficulty ${settings.difficulty}`,
    // Allow direct `connect <ip>` instead of forcing the matchmaking lobby.
    "sv_allow_lobby_connect_only 0",
  ];
  const serverCfg = serverCfgLines.map((line) => `      ${line}`).join("\n");
  // EXTRA_ARGS only carries cvars that must be set at boot (before the Steam
  // Game Server connection is established).
  const extraArgs: string[] = [`+maxplayers ${settings.maxPlayers}`];
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
    configs:
      - source: ghost_l4d2_server_cfg
        target: /cfg/server.cfg

configs:
  ghost_l4d2_server_cfg:
    content: |
${serverCfg}
`;
};
