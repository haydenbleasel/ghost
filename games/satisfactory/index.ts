import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildSatisfactoryCompose } from "./install";
import { satisfactorySettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildSatisfactoryCompose(config, resolveSettings(satisfactorySettings, raw));

export const satisfactory = {
  buildCompose,
  description:
    "Construct factories, automate production, and explore an alien planet with friends.",
  enabled: true,
  gamedigId: "satisfactory",
  id: "satisfactory",
  image: steamHeader(526_870),
  name: "Satisfactory",
  ports: [
    // Satisfactory 1.0+ uses a single port (7777) for both game traffic and queries.
    {
      from: 7777,
      protocol: "udp",
      to: 7777,
    },
    {
      from: 7777,
      protocol: "tcp",
      to: 7777,
    },
  ],
  requirements: {
    cpu: 4,
    memory: 12,
  },
  settings: satisfactorySettings,
  usesJoinPassword: false,
} as const;
