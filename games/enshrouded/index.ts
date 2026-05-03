import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import image from "./image.jpg";
import { buildEnshroudedCompose } from "./install";
import { enshroudedSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildEnshroudedCompose(config, resolveSettings(enshroudedSettings, raw));

export const enshrouded = {
  buildCompose,
  description:
    "A game of survival, crafting, and action on a sprawling voxel-based continent.",
  enabled: true,
  gamedigId: "enshrouded",
  id: "enshrouded",
  image,
  name: "Enshrouded",
  ports: [
    // This is the default port for Enshrouded, used for game traffic.
    {
      from: 15_636,
      protocol: "udp",
      to: 15_636,
    },
    // This is the port for Steam Query
    {
      from: 27_015,
      protocol: "udp",
      to: 27_015,
    },
  ],
  requirements: {
    cpu: 2,
    memory: 4,
  },
  settings: enshroudedSettings,
} as const;
