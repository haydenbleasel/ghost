import image from "./image.jpg";
import { buildTerrariaCompose } from "./install";

export const terraria = {
  buildCompose: buildTerrariaCompose,
  description: "Dig, fight, explore, build! Nothing is impossible in this 2D adventure game.",
  enabled: true,
  gamedigId: "terrariatshock",
  id: "terraria",
  image,
  name: "Terraria",
  ports: [
    // This is the default port for Terraria, used for game traffic.
    {
      from: 7777,
      protocol: "tcp",
      to: 7777,
    },
    // This port was mentioned in the dockerfile.
    {
      from: 7878,
      protocol: "tcp",
      to: 7878,
    },
  ],
  requirements: {
    cpu: 1,
    memory: 2,
  },
} as const;
