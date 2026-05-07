import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import image from "./image.jpg";
import { buildCs2Compose } from "./install";
import { cs2Settings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildCs2Compose(config, resolveSettings(cs2Settings, raw));

export const cs2 = {
  buildCompose,
  description:
    "The legendary tactical FPS. Plant the bomb, defuse it, or just frag your friends.",
  enabled: true,
  gamedigId: "cs2",
  id: "cs2",
  image,
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
    memory: 4,
  },
  settings: cs2Settings,
  usesJoinPassword: true,
} as const;
