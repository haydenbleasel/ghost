import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildSatisfactoryCompose, dockerImage } from "./install";
import { satisfactorySettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildSatisfactoryCompose(config, resolveSettings(satisfactorySettings, raw));

export const satisfactory = {
  buildCompose,
  description:
    "Construct factories, automate production, and explore an alien planet with friends.",
  dockerImage,
  enabled: true,
  gamedigId: "satisfactory",
  id: "satisfactory",
  image: steamHeader(526_870),
  name: "Satisfactory",
  ports: [
    // Game traffic.
    {
      from: 7777,
      protocol: "udp",
      to: 7777,
    },
    // HTTPS messaging API the client uses for handshake, encryption token, and admin.
    {
      from: 7777,
      protocol: "tcp",
      to: 7777,
    },
  ],
  requirements: {
    cpu: 4,
    disk: 20,
    memory: 12,
  },
  settings: satisfactorySettings,
  usesJoinPassword: false,
} as const;
