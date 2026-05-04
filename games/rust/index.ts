import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import image from "./image.jpg";
import { buildRustCompose } from "./install";
import { rustSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildRustCompose(config, resolveSettings(rustSettings, raw));

export const rust = {
  buildCompose,
  description:
    "The only aim in Rust is to survive when everything on the island wants you to die.",
  enabled: true,
  gamedigId: "rust",
  id: "rust",
  image,
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
  ],
  requirements: {
    cpu: 4,
    memory: 8,
  },
  settings: rustSettings,
} as const;
