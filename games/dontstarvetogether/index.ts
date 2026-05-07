import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import image from "./image.jpg";
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
  image,
  name: "Don't Starve Together",
  ports: [
    // Master shard — the only port DST clients connect to.
    {
      from: 10_999,
      protocol: "udp",
      to: 10_999,
    },
  ],
  requirements: {
    cpu: 2,
    memory: 2,
  },
  settings: dontStarveTogetherSettings,
  usesJoinPassword: true,
} as const;
