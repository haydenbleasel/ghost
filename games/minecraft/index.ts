import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import image from "./image.jpg";
import { buildMinecraftCompose } from "./install";
import { minecraftSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildMinecraftCompose(config, resolveSettings(minecraftSettings, raw));

export const minecraft = {
  buildCompose,
  description:
    "Minecraft is a sandbox game where you can build your own world.",
  enabled: true,
  gamedigId: "minecraft",
  id: "minecraft",
  image,
  name: "Minecraft",
  ports: [
    // This is the default port for Minecraft Java Edition, used for game traffic.
    {
      from: 25_565,
      protocol: "tcp",
      to: 25_565,
    },
    // For Bedrock clients via a proxy like Geyser.
    {
      from: 19_132,
      protocol: "udp",
      to: 19_133,
    },
  ],
  requirements: {
    cpu: 2,
    memory: 8,
  },
  settings: minecraftSettings,
} as const;
