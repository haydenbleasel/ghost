import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const minecraftSettings = defineSettings({
  allowNether: {
    default: true,
    label: "Allow Nether",
    type: "boolean",
  },
  difficulty: {
    default: "normal",
    label: "Difficulty",
    options: [{ value: "peaceful" }, { value: "easy" }, { value: "normal" }, { value: "hard" }],
    type: "select",
  },
  enableCommandBlock: {
    default: true,
    label: "Enable command blocks",
    type: "boolean",
  },
  maxPlayers: {
    default: 20,
    label: "Max players",
    max: 100,
    min: 1,
    type: "number",
  },
  mode: {
    default: "survival",
    label: "Game mode",
    options: [
      { value: "survival" },
      { value: "creative" },
      { value: "adventure" },
      { value: "spectator" },
    ],
    type: "select",
  },
  onlineMode: {
    default: true,
    help: "Require a valid Mojang account to join. Disable to allow cracked clients.",
    label: "Online mode",
    type: "boolean",
  },
  pvp: {
    default: true,
    label: "PvP",
    type: "boolean",
  },
  spawnProtection: {
    default: 0,
    label: "Spawn protection radius",
    max: 64,
    min: 0,
    type: "number",
  },
  viewDistance: {
    default: 10,
    help: "Chunks rendered around each player. Higher values increase CPU load.",
    label: "View distance",
    max: 32,
    min: 3,
    type: "number",
  },
});

export type MinecraftSettings = SettingsValues<typeof minecraftSettings>;
