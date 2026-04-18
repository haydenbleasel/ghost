import image from "./image.jpg";
import { buildPalworldCompose } from "./install";

export const palworld = {
  buildCompose: buildPalworldCompose,
  description: 'Fight, farm, build and work alongside mysterious creatures called "Pals".',
  enabled: true,
  gamedigId: "palworld",
  id: "palworld",
  image,
  name: "Palworld",
  ports: [
    // This is the default port for Palworld, used for game traffic.
    {
      from: 8211,
      protocol: "udp",
      to: 8211,
    },
    // This is the port for Steam Query
    {
      from: 27_015,
      protocol: "udp",
      to: 27_015,
    },
    // This is the port for RCON
    {
      from: 25_575,
      protocol: "tcp",
      to: 25_575,
    },
  ],
  requirements: {
    cpu: 4,
    memory: 16,
  },
} as const;
