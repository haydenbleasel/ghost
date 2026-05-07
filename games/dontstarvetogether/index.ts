import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildDontStarveTogetherCompose } from "./install";
import { dontStarveTogetherSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildDontStarveTogetherCompose(
    config,
    resolveSettings(dontStarveTogetherSettings, raw)
  );

export const dontStarveTogether = {
  buildCompose,
  description:
    "A multiplayer survival sandbox where you brave hunger, monsters, and madness with friends.",
  enabled: true,
  gamedigId: "dst",
  id: "dontstarvetogether",
  image: steamHeader(322_330),
  name: "Don't Starve Together",
  ports: [
    // Master shard — the port DST clients connect to.
    {
      from: 10_999,
      protocol: "udp",
      to: 10_999,
    },
    // Steam master server registration (public server browser).
    {
      from: 27_017,
      protocol: "udp",
      to: 27_017,
    },
    // Steam authentication.
    {
      from: 8767,
      protocol: "udp",
      to: 8767,
    },
  ],
  requirements: {
    cpu: 2,
    memory: 2,
  },
  settings: dontStarveTogetherSettings,
  usesJoinPassword: true,
} as const;
