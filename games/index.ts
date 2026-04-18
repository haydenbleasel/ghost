import { enshrouded } from "./enshrouded";
import { minecraft } from "./minecraft";
import { palworld } from "./palworld";
import { rust } from "./rust";
import { terraria } from "./terraria";
import { valheim } from "./valheim";

export const games = [minecraft, valheim, palworld, enshrouded, rust, terraria];

export type Game = (typeof games)[number];

export const getGame = (id: string): Game | undefined => games.find((g) => g.id === id);

export { type ComposeConfig, type GamePort, buildUfwRules, GAME_CONTAINER_NAME } from "./compose";
