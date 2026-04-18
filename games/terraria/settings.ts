import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const terrariaSettings = defineSettings({
  difficulty: {
    default: "1",
    help: "Takes effect when generating a new world.",
    label: "Difficulty",
    options: [
      { label: "Classic", value: "0" },
      { label: "Expert", value: "1" },
      { label: "Master", value: "2" },
      { label: "Journey", value: "3" },
    ],
    type: "select",
  },
  maxPlayers: {
    default: 16,
    label: "Max players",
    max: 16,
    min: 1,
    type: "number",
  },
  motd: {
    default: "",
    label: "Message of the day",
    maxLength: 256,
    type: "string",
  },
  worldSize: {
    default: "2",
    help: "Takes effect when generating a new world.",
    label: "World size",
    options: [
      { label: "Small", value: "1" },
      { label: "Medium", value: "2" },
      { label: "Large", value: "3" },
    ],
    type: "select",
  },
});

export type TerrariaSettings = SettingsValues<typeof terrariaSettings>;
