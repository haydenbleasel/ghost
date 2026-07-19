import { games, getDefaults, getGame, missingRequiredFields } from "../games";
import { generateJoinPassword, generateRconPassword } from "../lib/credentials";

const printUsage = (): void => {
  process.stderr.write(
    `Usage: bun run game:compose <gameId> [--name <name>] [--timezone <tz>] [--memory <gb>]

Prints a docker-compose YAML to stdout, populated with the game's default
settings and freshly generated rcon / join passwords. Pipe to a file to use it:

  bun run game:compose minecraft > docker-compose.yml
  docker compose up

Options:
  --name <name>   Server name (default: "<Game> Local")
  --timezone <tz> Container timezone (default: UTC)
  --memory <gb>   Machine memory in GB; games size heaps/caches from it
  --help, -h      Show this help

Available games:
${games.map((g) => `  - ${g.id}`).join("\n")}
`
  );
};

const fail = (message: string): never => {
  process.stderr.write(`${message}\n\n`);
  printUsage();
  process.exit(1);
};

interface ParsedArgs {
  gameId?: string;
  name?: string;
  timezone?: string;
  memoryGb?: number;
  help: boolean;
}

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const out: ParsedArgs = { help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      out.help = true;
    } else if (arg === "--name" || arg === "--timezone" || arg === "--memory") {
      const value = argv[i + 1];
      if (value === undefined) {
        fail(`Missing value for ${arg}`);
      }
      if (arg === "--name") {
        out.name = value;
      } else if (arg === "--timezone") {
        out.timezone = value;
      } else {
        const memoryGb = Number(value);
        if (!Number.isFinite(memoryGb) || memoryGb <= 0) {
          fail(`Invalid value for --memory: ${value}`);
        }
        out.memoryGb = memoryGb;
      }
      i += 1;
    } else if (arg?.startsWith("-")) {
      fail(`Unknown option: ${arg}`);
    } else if (out.gameId) {
      fail(`Unexpected argument: ${arg}`);
    } else {
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

const game = getGame(args.gameId) ?? fail(`Unknown game: ${args.gameId}`);

// The compose is built from default settings, so required fields with no
// default (e.g. Don't Starve Together's cluster token) come out empty: the
// YAML is valid but the server won't boot until they are filled in.
const missing = missingRequiredFields(
  game.settings,
  getDefaults(game.settings)
);
if (missing.length > 0) {
  process.stderr.write(
    `Warning: ${game.name} has required settings with no default (${missing.join(
      ", "
    )}); fill them in before running the generated compose file.\n`
  );
}

const compose = game.buildCompose(
  {
    joinPassword: game.usesJoinPassword ? generateJoinPassword() : null,
    memoryGb: args.memoryGb ?? null,
    name: args.name ?? `${game.name} Local`,
    rconPassword: generateRconPassword(),
    timezone: args.timezone,
  },
  {}
);

process.stdout.write(compose);
