import type { ComposeConfig } from "../compose";
import { resolveSettings } from "../settings";
import { steamHeader } from "../steam";
import { buildL4d2Compose, dockerImage } from "./install";
import { l4d2Settings } from "./settings";

const buildCompose = (config: ComposeConfig, raw: unknown): string =>
  buildL4d2Compose(config, resolveSettings(l4d2Settings, raw));

export const l4d2 = {
  buildCompose,
  description:
    "Co-op zombie apocalypse FPS. Fight your way through hordes of the infected with up to 3 friends.",
  dockerImage,
  enabled: true,
  gamedigId: "left4dead2",
  howToConnect: [
    "Open Left 4 Dead 2 and go to Options → Keyboard/Mouse.",
    'Set "Allow Developer Console" to Enabled.',
    "Press `~` from the main menu to open the console.",
    "Run `connect {address}`.",
  ],
  id: "l4d2",
  image: steamHeader(550),
  name: "Left 4 Dead 2",
  ports: [
    // Game traffic.
    {
      from: 27_015,
      protocol: "udp",
      to: 27_015,
    },
    // RCON.
    {
      from: 27_015,
      protocol: "tcp",
      to: 27_015,
    },
  ],
  requirements: {
    cpu: 2,
    disk: 15,
    memory: 2,
  },
  settings: l4d2Settings,
  // L4D2's coop lobby flow rejects clients after sv_password verification on
  // direct connect — leaving the server effectively unreachable when a
  // password is set. Disable join passwords; servers stay private via
  // unlisted IP/port.
  usesJoinPassword: false,
} as const;
