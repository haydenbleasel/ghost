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
  howToConnect: [
    'Launch Satisfactory and open "Server Manager" from the main menu.',
    'Click "Add Server" and enter `{address}`.',
    "When prompted, accept the server's self-signed certificate fingerprint.",
    "Claim the server using your admin password (shown in the Settings tab).",
    "Pick or upload a save, set max players, then join from the server list.",
  ],
  id: "satisfactory",
  image: steamHeader(526_870),
  name: "Satisfactory",
  ports: [
    // Game traffic and lightweight query API.
    {
      from: 7777,
      protocol: "udp",
      to: 7777,
    },
    // HTTPS server API used by the client during handshake.
    {
      from: 7777,
      protocol: "tcp",
      to: 7777,
    },
    // Reliable Messaging port (separate from game per Satisfactory 1.1+).
    {
      from: 8888,
      protocol: "tcp",
      to: 8888,
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
