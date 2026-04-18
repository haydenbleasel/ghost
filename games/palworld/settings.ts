import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const palworldSettings = defineSettings({
  description: {
    default: "",
    label: "Server description",
    maxLength: 256,
    type: "string",
  },
  difficulty: {
    default: "None",
    label: "Difficulty",
    options: [
      { label: "Default", value: "None" },
      { value: "Easy" },
      { value: "Normal" },
      { value: "Hard" },
    ],
    type: "select",
  },
  maxPlayers: {
    default: 16,
    label: "Max players",
    max: 32,
    min: 1,
    type: "number",
  },
  multithreading: {
    default: true,
    help: "Improves performance on servers with 4+ cores.",
    label: "Multithreading",
    type: "boolean",
  },
  pvp: {
    default: false,
    label: "PvP",
    type: "boolean",
  },
});

export type PalworldSettings = SettingsValues<typeof palworldSettings>;
