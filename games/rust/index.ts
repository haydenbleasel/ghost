import image from "./image.jpg";

export const rust = {
  description: "The only aim in Rust is to survive when everything on the island wants you to die.",
  enabled: false,
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
    // This is the port for RCON
    {
      from: 28_016,
      protocol: "tcp",
      to: 28_016,
    },
    // This port was mentioned in the dockerfile.
    {
      from: 28_082,
      protocol: "tcp",
      to: 28_082,
    },
  ],
  requirements: {
    cpu: 4,
    memory: 8,
  },
} as const;
