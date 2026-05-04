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
    // Enshrouded uses a single UDP port for both game traffic and Steam query.
    {
      from: 15_637,
      protocol: "udp",
      to: 15_637,
    },
  ],
  requirements: {
    cpu: 2,
    memory: 4,
  },
  settings: enshroudedSettings,
  usesJoinPassword: true,
} as const;
