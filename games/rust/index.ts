import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildRustCompose, dockerImage } from "./install";
import { rustSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildRustCompose(config, resolveSettings(rustSettings, raw));

export const rust = {
  buildCompose,
  description:
    "The only aim in Rust is to survive when everything on the island wants you to die.",
  dockerImage,
  enabled: true,
  gamedigId: "rust",
  howToConnect: [
    'Launch Rust and click "Play Game" to load into the main menu.',
    "Press `F1` to open the console.",
    "Run `client.connect {address}` and press Enter.",
  ],
  id: "rust",
  image: steamHeader(252_490),
  name: "Rust",
  ports: [
    // This is the default port for Rust, used for game traffic.
    {
      from: 28_015,
      protocol: "udp",
      to: 28_015,
    },
    // This is the port for RCON (web RCON uses the same port via WebSocket).
    {
      from: 28_016,
      protocol: "tcp",
      to: 28_016,
    },
    // Steam query port — required for clients to connect (handshake validation).
    {
      from: 28_017,
      protocol: "udp",
      to: 28_017,
    },
  ],
  requirements: {
    cpu: 4,
    disk: 30,
    memory: 8,
  },
  settings: rustSettings,
  usesJoinPassword: false,
} as const;
