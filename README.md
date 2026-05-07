# Ghost

![Ghost — control plane for dedicated game servers](app/opengraph-image.png)

Simple, beautiful game servers. Ghost is a dedicated game server platform you can read, fork, and self-host. Spin one up in seconds — Docker, SSH, and firewall rules handled for you.

## Layout

```
app/                  Next.js App Router — UI, API, Better Auth
lib/                  server-side libs (db, redis, hetzner, agent helpers, workflows)
protocol/             Zod schemas + signing canonicalization shared with the agent
agent/                Bun-built TypeScript agent (compiled to a Linux binary)
prisma/               schema + migrations
games/                per-game compose generators
```

## Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/haydenbleasel/ghost.git
   cd ghost
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Provision the backing services**
   - **Postgres** via [Neon](https://neon.tech) — grab both the pooled and direct connection strings.
   - **Redis** via [Vercel KV](https://vercel.com/docs/storage/vercel-kv) or [Upstash](https://upstash.com).
   - **Blob storage** via [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — used to host the agent binary.

4. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the values from step 3. Generate `BOOTSTRAP_JWT_SECRET` and `BETTER_AUTH_SECRET` with `openssl rand -hex 32`.

5. **Run database migrations**

   ```bash
   bun migrate
   ```

6. **Enable Vercel Deployment Protection bypass** (preview deploys only)

   In your Vercel project settings, enable **Deployment Protection → Protection Bypass for Automation**. The generated value is auto-injected as `VERCEL_AUTOMATION_BYPASS_SECRET` so Hetzner agents can punch through the auth wall on callbacks.

7. **Deploy to Vercel**

   ```bash
   vercel deploy
   ```

8. **Sign in and bake your golden image**

   Open the deployed app, sign in, save a Hetzner Cloud token on `/dashboard/account/backend`, and click **Build snapshot**. Baking takes ~10–15 min.

> [!NOTE]
> New Hetzner Cloud accounts are capped at 5 servers per project until the account is verified. Provisioning fails with `resource_limit_exceeded` once you hit it — request a limit increase from Hetzner support.

### Adding a new game

Each game lives in its own folder under `games/`. To add one:

1. **Create a folder** — `games/<your-game>/` with three files:
   - `install.ts` — exports `dockerImage` (the upstream image tag) and `build<Game>Compose(config, settings)` (returns the compose YAML string).
   - `settings.ts` — exports a settings schema via `defineSettings(...)` describing the per-server options.
   - `index.ts` — exports the game definition (`id`, `name`, `description`, `image`, `dockerImage`, `ports`, `requirements`, `settings`, `buildCompose`, etc.). Use an existing folder like `games/minecraft/` as a template.

2. **Register it in `games/index.ts`** — import your game and add it to the `games` array.

3. **Redeploy and rebuild the snapshot** — the snapshot's `docker pull` list is derived from `games[].dockerImage`, so once you redeploy, click **Build snapshot** again to bake the new image into the golden image.

## Scripts

- `bun dev` — Next dev server (turbopack)
- `bun run build` — prisma generate + next build
