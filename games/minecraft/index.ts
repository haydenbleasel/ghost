import image from "./image.jpg";

export const minecraft = {
  description: "Minecraft is a sandbox game where you can build your own world.",
  enabled: true,
  gamedigId: "minecraft",
  id: "minecraft",
  image,
  name: "Minecraft",
  ports: [
    // This is the default port for Minecraft Java Edition, used for game traffic.
    {
      from: 25_565,
      protocol: "tcp",
      to: 25_565,
    },
    // For Bedrock clients via a proxy like Geyser.
    {
      from: 19_132,
      protocol: "udp",
      to: 19_133,
    },
  ],
  requirements: {
    cpu: 2,
    memory: 4,
  },
} as const;
