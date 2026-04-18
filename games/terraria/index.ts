import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import image from "./image.jpg";
import { buildTerrariaCompose } from "./install";
import { terrariaSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildTerrariaCompose(config, resolveSettings(terrariaSettings, raw));

export const terraria = {
  buildCompose,
  description: "Dig, fight, explore, build! Nothing is impossible in this 2D adventure game.",
  enabled: true,
  gamedigId: "terrariatshock",
  id: "terraria",
  image,
  name: "Terraria",
  ports: [
    // This is the default port for Terraria, used for game traffic.
    {
      from: 7777,
      protocol: "tcp",
      to: 7777,
    },
    // This port was mentioned in the dockerfile.
    {
      from: 7878,
      protocol: "tcp",
      to: 7878,
    },
  ],
  requirements: {
    cpu: 1,
    memory: 2,
  },
  settings: terrariaSettings,
} as const;
