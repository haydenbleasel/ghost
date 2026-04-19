import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const rustSettings = defineSettings({
  description: {
    default: "",
    label: "Server description",
    maxLength: 512,
    type: "string",
  },
  maxPlayers: {
    default: 50,
    label: "Max players",
    max: 200,
    min: 10,
    type: "number",
  },
  rconWeb: {
    default: true,
    help: "Enables WebSocket RCON on the RCON port.",
    label: "Web RCON",
    type: "boolean",
  },
  seed: {
    default: 12_345,
    help: "Takes effect on next wipe.",
    label: "World seed",
    max: 2_147_483_647,
    min: 1,
    type: "number",
  },
  worldSize: {
    default: 3000,
    help: "Map size in metres. Takes effect on next wipe.",
    label: "World size",
    max: 6000,
    min: 1000,
    step: 500,
    type: "number",
  },
});

export type RustSettings = SettingsValues<typeof rustSettings>;
