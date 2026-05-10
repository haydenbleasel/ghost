import { cs2 } from "./cs2";
import { dontStarveTogether } from "./dontstarvetogether";
import { enshrouded } from "./enshrouded";
import { factorio } from "./factorio";
import { l4d2 } from "./l4d2";
import { minecraft } from "./minecraft";
import { palworld } from "./palworld";
import { rust } from "./rust";
import { satisfactory } from "./satisfactory";
import { terraria } from "./terraria";
import { valheim } from "./valheim";
import { vrising } from "./vrising";

export { steamHeader } from "./steam";

export const games = [
  minecraft,
  valheim,
  palworld,
  enshrouded,
  vrising,
  rust,
  terraria,
  satisfactory,
  cs2,
  l4d2,
  dontStarveTogether,
  factorio,
];

export type Game = (typeof games)[number];

export const getGame = (id: string): Game | undefined =>
  games.find((g) => g.id === id);

export {
  type ComposeConfig,
  type GamePort,
  buildUfwRules,
  GAME_CONTAINER_NAME,
} from "./compose";
export {
  defineSettings,
  getDefaults,
  hasRequiredFields,
  missingRequiredFields,
  resolveSettings,
  type SettingField,
  type SettingsSchema,
  type SettingsValues,
  validateSettings,
} from "./settings";
