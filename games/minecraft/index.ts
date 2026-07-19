import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { buildMinecraftCompose, dockerImage } from "./install";
import { minecraftSettings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildMinecraftCompose(config, resolveSettings(minecraftSettings, raw));

export const minecraft = {
  buildCompose,
  description:
    "Minecraft is a sandbox game where you can build your own world.",
  dockerImage,
  enabled: true,
  gamedigId: "minecraft",
  id: "minecraft",
  image: "/games/minecraft.jpg",
  name: "Minecraft",
  ports: [
    // This is the default port for Minecraft Java Edition, used for game traffic.
    // No Bedrock/Geyser port: the compose runs a plain Java server, so
    // advertising 19132/udp would surface a port nothing listens on.
    {
      from: 25_565,
      protocol: "tcp",
      to: 25_565,
    },
  ],
  requirements: {
    cpu: 2,
    disk: 10,
    memory: 8,
  },
  settings: minecraftSettings,
  usesJoinPassword: false,
} as const;
