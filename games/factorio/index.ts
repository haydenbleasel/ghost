import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildFactorioCompose, dockerImage } from "./install";
import { factorioSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildFactorioCompose(config, resolveSettings(factorioSettings, raw));

export const factorio = {
  buildCompose,
  description:
    "Build and grow a factory on an alien planet. Co-op automation sandbox.",
  dockerImage,
  enabled: true,
  gamedigId: "factorio",
  howToConnect: [
    "Open Factorio and choose Multiplayer.",
    "Select Connect to address.",
    "Enter `{address}` and the join password if one is set.",
  ],
  id: "factorio",
  image: steamHeader(427_520),
  name: "Factorio",
  ports: [
    {
      from: 34_197,
      protocol: "udp",
      to: 34_197,
    },
    {
      from: 27_015,
      protocol: "tcp",
      to: 27_015,
    },
  ],
  requirements: {
    cpu: 2,
    disk: 10,
    memory: 4,
  },
  settings: factorioSettings,
  usesJoinPassword: true,
} as const;
