import image from "./image.jpg";

export const valheim = {
  description: "A Viking-themed action RPG where you explore, craft, build, and survive.",
  enabled: true,
  gamedigId: "valheim",
  id: "valheim",
  image,
  name: "Valheim",
  ports: [
    // This is the default port for Valheim, used for game traffic.
    {
      from: 2456,
      protocol: "udp",
      to: 2458,
    },
  ],
  requirements: {
    cpu: 2,
    memory: 4,
  },
} as const;
