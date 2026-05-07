import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const vrisingSettings = defineSettings({
  gameSettingsPreset: {
    default: "StandardPvP",
    help: "Picks the rule set for the world. Resets cannot be applied to an existing save.",
    label: "Game preset",
    options: [
      { label: "Standard PvP", value: "StandardPvP" },
      { label: "Standard PvE", value: "StandardPvE" },
      { label: "Hardcore PvP", value: "StandardPvP_Hardcore" },
      { label: "Hardcore PvE", value: "StandardPvE_Hardcore" },
      { label: "Duo PvP", value: "Duo" },
      { label: "Solo PvP", value: "Solo" },
    ],
    type: "select",
  },
  maxPlayers: {
    default: 40,
    label: "Max players",
    max: 80,
    min: 1,
    type: "number",
  },
  public: {
    default: true,
    help: "List this server on the public V Rising server browser.",
    label: "Public listing",
    type: "boolean",
  },
  saveName: {
    default: "world1",
    help: "Name of the V Rising world save. Changing this creates a new world.",
    label: "Save name",
    maxLength: 64,
    type: "string",
  },
});

export type VrisingSettings = SettingsValues<typeof vrisingSettings>;
