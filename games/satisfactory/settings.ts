import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const satisfactorySettings = defineSettings({
  autoPause: {
    default: true,
    help: "Pauses the server when no players are connected.",
    label: "Auto pause",
    type: "boolean",
  },
  autoSaveInterval: {
    default: 300,
    help: "How often the server auto-saves, in seconds.",
    label: "Auto save interval",
    max: 3600,
    min: 60,
    step: 60,
    type: "number",
  },
  autoSaveOnDisconnect: {
    default: true,
    label: "Auto save on disconnect",
    type: "boolean",
  },
  disableSeasonalEvents: {
    default: false,
    label: "Disable seasonal events",
    type: "boolean",
  },
  maxPlayers: {
    default: 4,
    label: "Max players",
    max: 64,
    min: 1,
    type: "number",
  },
});

export type SatisfactorySettings = SettingsValues<typeof satisfactorySettings>;
