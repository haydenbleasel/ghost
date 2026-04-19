import { defineSettings } from "../settings";
import type { SettingsValues } from "../settings";

export const enshroudedSettings = defineSettings({
  slots: {
    default: 16,
    label: "Player slots",
    max: 16,
    min: 1,
    type: "number",
  },
  voiceChat: {
    default: true,
    label: "Voice chat",
    type: "boolean",
  },
});

export type EnshroudedSettings = SettingsValues<typeof enshroudedSettings>;
