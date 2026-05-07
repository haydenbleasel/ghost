import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildValheimCompose, dockerImage } from "./install";
import { valheimSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildValheimCompose(config, resolveSettings(valheimSettings, raw));

export const valheim = {
  buildCompose,
  description:
    "A Viking-themed action RPG where you explore, craft, build, and survive.",
  dockerImage,
  enabled: true,
  gamedigId: "valheim",
  id: "valheim",
  image: steamHeader(892_970),
  name: "Valheim",
  ports: [
    // This is the default port for Valheim, used for game traffic.
    {
      from: 2456,
      protocol: "udp",
      to: 2458,
    },
  ],
  requirements: {
    cpu: 2,
    disk: 10,
    memory: 6,
  },
  settings: valheimSettings,
  usesJoinPassword: true,
} as const;
