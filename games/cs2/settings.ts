import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const cs2Settings = defineSettings({
  botDifficulty: {
    default: "1",
    label: "Bot difficulty",
    options: [
      { label: "Easy", value: "0" },
      { label: "Normal", value: "1" },
      { label: "Hard", value: "2" },
      { label: "Expert", value: "3" },
    ],
    type: "select",
  },
  botQuota: {
    default: 0,
    help: "Number of bots to fill empty slots with. Set to 0 to disable.",
    label: "Bot quota",
    max: 64,
    min: 0,
    type: "number",
  },
  gameAlias: {
    default: "competitive",
    help: "Picks the game type and mode. 'Custom' lets server.cfg take over.",
    label: "Game mode",
    options: [
      { label: "Casual", value: "casual" },
      { label: "Competitive", value: "competitive" },
      { label: "Wingman", value: "wingman" },
      { label: "Deathmatch", value: "deathmatch" },
      { label: "Arms Race", value: "armsrace" },
      { label: "Custom", value: "custom" },
    ],
    type: "select",
  },
  lan: {
    default: false,
    help: "Run in LAN-only mode. Required if you don't have a Steam Game Server Login Token.",
    label: "LAN mode",
    type: "boolean",
  },
  maxPlayers: {
    default: 10,
    label: "Max players",
    max: 64,
    min: 2,
    type: "number",
  },
  startMap: {
    default: "de_inferno",
    label: "Starting map",
    options: [
      { label: "Inferno", value: "de_inferno" },
      { label: "Dust 2", value: "de_dust2" },
      { label: "Mirage", value: "de_mirage" },
      { label: "Nuke", value: "de_nuke" },
      { label: "Overpass", value: "de_overpass" },
      { label: "Anubis", value: "de_anubis" },
      { label: "Ancient", value: "de_ancient" },
      { label: "Vertigo", value: "de_vertigo" },
    ],
    type: "select",
  },
  steamToken: {
    default: "",
    help: "Steam Game Server Login Token (GSLT). Required for public servers — get one at steamcommunity.com/dev/managegameservers (App ID 730).",
    label: "Steam GSLT",
    maxLength: 64,
    type: "string",
  },
});

export type Cs2Settings = SettingsValues<typeof cs2Settings>;
