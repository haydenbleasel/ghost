import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildTerrariaCompose, dockerImage } from "./install";
import { terrariaSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildTerrariaCompose(config, resolveSettings(terrariaSettings, raw));

export const terraria = {
  buildCompose,
  description:
    "Dig, fight, explore, build! Nothing is impossible in this 2D adventure game.",
  dockerImage,
  enabled: true,
  gamedigId: "terrariatshock",
  id: "terraria",
  image: steamHeader(105_600),
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
    disk: 5,
    memory: 2,
  },
  settings: terrariaSettings,
  usesJoinPassword: true,
} as const;
