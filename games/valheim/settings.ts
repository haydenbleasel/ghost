import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const valheimSettings = defineSettings({
  crossplay: {
    default: true,
    help: "Allow players from Xbox, PlayStation, and Game Pass to join.",
    label: "Crossplay",
    type: "boolean",
  },
  public: {
    default: true,
    help: "List this server on the in-game community browser.",
    label: "Public listing",
    type: "boolean",
  },
  worldName: {
    default: "ghost",
    help: "Filename of the Valheim world. Changing this creates a new world.",
    label: "World name",
    maxLength: 64,
    type: "string",
  },
});

export type ValheimSettings = SettingsValues<typeof valheimSettings>;
