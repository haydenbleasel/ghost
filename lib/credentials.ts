import crypto from "node:crypto";

import { humanId } from "human-id";

export const generateRconPassword = (): string =>
  crypto.randomBytes(16).toString("hex");

export const generateJoinPassword = (): string =>
  humanId({ adjectiveCount: 0, capitalize: false, separator: "-" });
