# Contributing to Ghost

Thanks for taking the time to contribute. Ghost is an open-source control plane for dedicated game servers, and PRs, issues, and game requests are all welcome.

By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug** — open an [issue](https://github.com/haydenbleasel/ghost/issues/new) with steps to reproduce, expected vs. actual behavior, and your environment.
- **Request a game** — open an issue describing the game and its container image. Most additions are a one-line change to `lib/workflows/build-snapshot-cloud-init.ts` plus per-game files under `games/`.
- **Submit a fix or feature** — fork, branch, and open a PR. For anything non-trivial, please open an issue first so we can agree on the approach.
- **Report a security issue** — see [SECURITY.md](./SECURITY.md). Please don't file public issues for vulnerabilities.

## Local setup

Ghost runs on Bun. You'll need accounts for Neon (Postgres), Upstash/Vercel KV (Redis), Vercel Blob, and Hetzner Cloud — see the [README](../README.md#setup) for the full list of env vars.

```bash
bun install
cp .env.example .env.local   # then fill in values
bun migrate                  # prisma format + generate + push
bun dev                      # Next dev server on :3000
```

The agent is built separately:

```bash
bun agent:dev                # run the agent locally with Bun
bun agent:build              # cross-compile to dist/ghost-agent (Linux x64)
```

## Adding a new game

1. Create `games/<slug>/` with `index.ts`, `install.ts`, `settings.ts`, and `image.jpg`.
2. Re-export it from `games/index.ts`.
3. Add a `docker pull <image>` line in `lib/workflows/build-snapshot-cloud-init.ts` so it's baked into the snapshot.
4. Existing users will need to click **Build snapshot** again to pick up the new image.

## Pull request guidelines

- Branch from `main`. Keep PRs focused — one concern per PR.
- Run `bun check` (lint + format) before pushing.
- Make sure `bun run build` passes.
- Match the existing code style. We use [oxlint](https://oxc.rs/) and [oxfmt](https://oxc.rs/), wrapped via `ultracite`.
- Don't commit `.env*` files or other secrets.
- Fill out the [PR template](./pull_request_template.md), including screenshots for UI changes.

## Commit messages

No strict convention, but keep them short and descriptive. Reference issues with `Closes #123` in the PR description, not the commit subject.

## Project layout

```
app/         Next.js App Router — UI, API, Better Auth
lib/         server-side libs (db, redis, hetzner, agent helpers, workflows)
protocol/    Zod schemas + signing canonicalization shared with the agent
agent/       Bun-built TypeScript agent (compiled to a Linux binary)
prisma/      schema + migrations
games/       per-game compose generators
```

For an architectural overview, see the [How it works](https://github.com/haydenbleasel/ghost/blob/main/app/how-it-works/page.tsx) page or run the site locally and visit `/how-it-works`.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../license.md).
