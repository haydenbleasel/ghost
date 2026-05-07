import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildDontStarveTogetherCompose, dockerImage } from "./install";
import { dontStarveTogetherSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildDontStarveTogetherCompose(
    config,
    resolveSettings(dontStarveTogetherSettings, raw)
  );

export const dontStarveTogether = {
  buildCompose,
  description:
    "A multiplayer survival sandbox where you brave hunger, monsters, and madness with friends.",
  dockerImage,
  enabled: true,
  gamedigId: "dst",
  howToConnect: [
    'Launch Don\'t Starve Together and click "Play".',
    'In Settings, make sure "Enable Console" is turned on.',
    "From the main menu press `~` to open the console.",
    'Run `c_connect("{address-host}", {address-port}, "<your password>")` using the password shown above.',
  ],
  id: "dontstarvetogether",
  image: steamHeader(322_330),
  name: "Don't Starve Together",
  ports: [
    // Master shard — the port DST clients connect to.
    {
      from: 10_999,
      protocol: "udp",
      to: 10_999,
    },
    // Steam master server registration (public server browser).
    {
      from: 27_017,
      protocol: "udp",
      to: 27_017,
    },
    // Steam authentication.
    {
      from: 8767,
      protocol: "udp",
      to: 8767,
    },
  ],
  requirements: {
    cpu: 2,
    disk: 10,
    memory: 2,
  },
  settings: dontStarveTogetherSettings,
  usesJoinPassword: true,
} as const;
