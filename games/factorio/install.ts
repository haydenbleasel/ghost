import type { ComposeConfig } from "../compose";
import type { FactorioSettings } from "./settings";

export const dockerImage = "factoriotools/factorio:stable";

const indentBlock = (body: string, spaces: number): string => {
  const pad = " ".repeat(spaces);
  return body
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
};

export const buildFactorioCompose = (
  config: ComposeConfig,
  settings: FactorioSettings
): string => {
  const timezone = config.timezone ?? "UTC";
  // server-settings.json is the canonical config surface for Factorio.
  // Most tunables (name, max_players, password, visibility) have no env-var
  // route, so we render the file fresh on every deploy and inject it via a
  // docker config so UI changes take effect on container recreation.
  const serverSettings = {
    afk_autokick_interval: 0,
    allow_commands: "admins-only",
    auto_pause: settings.autoPause,
    autosave_interval: settings.autosaveIntervalMinutes,
    autosave_only_on_server: true,
    autosave_slots: 5,
    description: settings.description,
    game_password: config.joinPassword ?? "",
    ignore_player_limit_for_returning_players: true,
    max_players: settings.maxPlayers,
    max_upload_in_kilobytes_per_second: 0,
    max_upload_slots: 5,
    minimum_latency_in_ticks: 0,
    name: config.name,
    non_blocking_saving: true,
    only_admins_can_pause_the_game: true,
    require_user_verification: settings.requireUserVerification,
    tags: [],
    token: settings.factorioToken,
    username: settings.factorioUsername,
    visibility: {
      lan: true,
      public: settings.visibility === "public",
    },
  };
  const serverSettingsBody = indentBlock(
    JSON.stringify(serverSettings, null, 2),
    6
  );
  // YAML literal block (`content: |`) preserves text verbatim — no escaping
  // needed (and applying compose-value quote escaping would mangle the
  // password).
  const rconBody = `      ${config.rconPassword}`;
  return `services:
  factorio:
    image: ${dockerImage}
    container_name: ghost-game
    restart: unless-stopped
    ports:
      - "34197:34197/udp"
      - "27015:27015/tcp"
    environment:
      TZ: "${timezone}"
      PUID: "1000"
      PGID: "1000"
      PORT: "34197"
      RCON_PORT: "27015"
      SAVE_NAME: "ghost"
      LOAD_LATEST_SAVE: "true"
      GENERATE_NEW_SAVE: "${settings.generateNewSave}"
      DLC_SPACE_AGE: "${settings.dlcSpaceAge}"
    volumes:
      - /var/lib/ghost/game/data/saves:/factorio/saves
      - /var/lib/ghost/game/data/mods:/factorio/mods
    configs:
      - source: ghost_factorio_server_settings
        target: /factorio/config/server-settings.json
      - source: ghost_factorio_rcon_password
        target: /factorio/config/rconpw

configs:
  ghost_factorio_server_settings:
    content: |
${serverSettingsBody}
  ghost_factorio_rcon_password:
    content: |
${rconBody}
`;
};
