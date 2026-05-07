import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildCs2Compose, dockerImage } from "./install";
import { cs2Settings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildCs2Compose(config, resolveSettings(cs2Settings, raw));

export const cs2 = {
  buildCompose,
  description:
    "The legendary tactical FPS. Plant the bomb, defuse it, or just frag your friends.",
  dockerImage,
  enabled: true,
  gamedigId: "cs2",
  howToConnect: [
    "Open Counter-Strike 2 and go to Settings → Game.",
    'Set "Enable Developer Console (~)" to Yes.',
    "Press `~` in-game to open the console.",
    "Run `connect {address}; password <your password>` using the password shown above.",
  ],
  id: "cs2",
  image: steamHeader(730),
  name: "Counter-Strike 2",
  ports: [
    // Game traffic.
    {
      from: 27_015,
      protocol: "udp",
      to: 27_015,
    },
    // RCON.
    {
      from: 27_015,
      protocol: "tcp",
      to: 27_015,
    },
    // SourceTV.
    {
      from: 27_020,
      protocol: "udp",
      to: 27_020,
    },
  ],
  requirements: {
    cpu: 2,
    disk: 50,
    memory: 4,
  },
  settings: cs2Settings,
  usesJoinPassword: true,
} as const;
