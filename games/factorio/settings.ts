import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const factorioSettings = defineSettings({
  autoPause: {
    default: true,
    help: "Pause the game while no players are connected.",
    label: "Auto pause",
    type: "boolean",
  },
  autosaveIntervalMinutes: {
    default: 5,
    label: "Autosave interval (minutes)",
    max: 60,
    min: 1,
    type: "number",
  },
  description: {
    default: "",
    label: "Description",
    maxLength: 256,
    type: "string",
  },
  dlcSpaceAge: {
    default: true,
    help: "Enable the Space Age DLC. Disable for vanilla 1.x or compatibility with mods that don't support Space Age.",
    label: "Space Age DLC",
    type: "boolean",
  },
  factorioToken: {
    default: "",
    help: "Token from factorio.com/profile. Required only for public listing.",
    label: "Factorio.com token",
    maxLength: 64,
    type: "string",
  },
  factorioUsername: {
    default: "",
    help: "Factorio.com username. Required only for public listing.",
    label: "Factorio.com username",
    maxLength: 64,
    type: "string",
  },
  generateNewSave: {
    default: true,
    help: "Generate a fresh save on first start. Existing saves still take precedence on subsequent starts.",
    label: "Generate new save",
    type: "boolean",
  },
  maxPlayers: {
    default: 10,
    label: "Max players",
    max: 250,
    min: 1,
    type: "number",
  },
  requireUserVerification: {
    default: true,
    help: "Require players to be authenticated against factorio.com.",
    label: "Require user verification",
    type: "boolean",
  },
  visibility: {
    default: "public",
    help: "Public lists the server on the Factorio matchmaking server (requires username + token — falls back to LAN only until both are set). LAN restricts discovery to the local network — direct-IP connect still works.",
    label: "Visibility",
    options: [
      { label: "Public", value: "public" },
      { label: "LAN only", value: "lan" },
    ],
    type: "select",
  },
});

export type FactorioSettings = SettingsValues<typeof factorioSettings>;
