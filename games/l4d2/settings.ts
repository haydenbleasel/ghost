import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const l4d2Settings = defineSettings({
  difficulty: {
    default: "normal",
    label: "Difficulty",
    options: [
      { label: "Easy", value: "easy" },
      { label: "Normal", value: "normal" },
      { label: "Advanced", value: "hard" },
      { label: "Expert", value: "impossible" },
    ],
    type: "select",
  },
  gameMode: {
    default: "coop",
    help: "Co-op is classic 4-player campaign. Versus pits 4 survivors against 4 infected players.",
    label: "Game mode",
    options: [
      { label: "Co-op (Campaign)", value: "coop" },
      { label: "Versus", value: "versus" },
      { label: "Realism", value: "realism" },
      { label: "Survival", value: "survival" },
      { label: "Scavenge", value: "scavenge" },
    ],
    type: "select",
  },
  maxPlayers: {
    default: 4,
    label: "Max players",
    max: 8,
    min: 1,
    type: "number",
  },
  startMap: {
    default: "c1m1_hotel",
    label: "Starting map",
    options: [
      { label: "Dead Center", value: "c1m1_hotel" },
      { label: "Dark Carnival", value: "c2m1_highway" },
      { label: "Swamp Fever", value: "c3m1_plankcountry" },
      { label: "Hard Rain", value: "c4m1_milltown_a" },
      { label: "The Parish", value: "c5m1_waterfront" },
      { label: "The Passing", value: "c6m1_riverbank" },
      { label: "The Sacrifice", value: "c7m1_docks" },
      { label: "No Mercy", value: "c8m1_apartment" },
      { label: "Crash Course", value: "c9m1_alleys" },
      { label: "Death Toll", value: "c10m1_caves" },
      { label: "Dead Air", value: "c11m1_greenhouse" },
      { label: "Blood Harvest", value: "c12m1_hilltop" },
      { label: "Cold Stream", value: "c13m1_alpinecreek" },
    ],
    type: "select",
  },
  steamToken: {
    default: "",
    help: "Steam Game Server Login Token (GSLT). Required for public servers — get one at steamcommunity.com/dev/managegameservers (App ID 222860).",
    label: "Steam GSLT",
    maxLength: 64,
    type: "string",
  },
});

export type L4d2Settings = SettingsValues<typeof l4d2Settings>;
