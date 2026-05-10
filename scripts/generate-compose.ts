import crypto from "node:crypto";

import { humanId } from "human-id";

import { games, getGame } from "../games";

const printUsage = (): void => {
  process.stderr.write(
    `Usage: bun run game:compose <gameId> [--name <name>] [--timezone <tz>]

Prints a docker-compose YAML to stdout, populated with the game's default
settings and freshly generated rcon / join passwords. Pipe to a file to use it:

  bun run game:compose minecraft > docker-compose.yml
  docker compose up

Available games:
${games.map((g) => `  - ${g.id}`).join("\n")}
`
  );
};

const parseArgs = (
  argv: readonly string[]
): { gameId?: string; name?: string; timezone?: string; help: boolean } => {
  const out: {
    gameId?: string;
    name?: string;
    timezone?: string;
    help: boolean;
  } = { help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      out.help = true;
    } else if (arg === "--name") {
      out.name = argv[i + 1];
      i += 1;
    } else if (arg === "--timezone") {
      out.timezone = argv[i + 1];
      i += 1;
    } else if (!out.gameId && arg && !arg.startsWith("-")) {
      out.gameId = arg;
    }
    i += 1;
  }
  return out;
};

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.gameId) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

const game = getGame(args.gameId);
if (!game) {
  process.stderr.write(`Unknown game: ${args.gameId}\n\n`);
  printUsage();
  process.exit(1);
}

const compose = game.buildCompose(
  {
    joinPassword: game.usesJoinPassword
      ? humanId({ adjectiveCount: 0, capitalize: false, separator: "-" })
      : null,
    name: args.name ?? `${game.name} Local`,
    rconPassword: crypto.randomBytes(16).toString("hex"),
    timezone: args.timezone,
  },
  {}
);

process.stdout.write(compose);
