import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const dontStarveTogetherSettings = defineSettings({
  clusterToken: {
    default: "",
    help: "Klei cluster token. Generate one at accounts.klei.com → Game Servers → Add New Server.",
    label: "Klei cluster token",
    maxLength: 256,
    required: true,
    type: "string",
  },
  gameMode: {
    default: "endless",
    help: "Takes effect when generating a new world.",
    label: "Game mode",
    options: [
      { label: "Endless", value: "endless" },
      { label: "Survival", value: "survival" },
      { label: "Wilderness", value: "wilderness" },
      { label: "Lights Out", value: "lightsout" },
    ],
    type: "select",
  },
  intention: {
    default: "cooperative",
    label: "Server intention",
    options: [
      { label: "Cooperative", value: "cooperative" },
      { label: "Competitive", value: "competitive" },
      { label: "Social", value: "social" },
      { label: "Madness", value: "madness" },
    ],
    type: "select",
  },
  maxPlayers: {
    default: 6,
    label: "Max players",
    max: 64,
    min: 1,
    type: "number",
  },
  pvp: {
    default: false,
    label: "PvP",
    type: "boolean",
  },
});

export type DontStarveTogetherSettings = SettingsValues<
  typeof dontStarveTogetherSettings
>;
