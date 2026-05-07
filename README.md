# Ghost

Open-source control plane for dedicated game servers. Next.js on Vercel, game VMs on Hetzner Cloud, coordinated by a small `ghost-agent` that runs on each VM.

For an overview of the architecture, the golden image, the agent protocol, and the provisioning lifecycle, see the **How it works** page (`/how-it-works`).

## Layout

```
app/                  Next.js App Router — UI, API, Better Auth
lib/                  server-side libs (db, redis, hetzner, agent helpers, workflows)
protocol/             Zod schemas + signing canonicalization shared with the agent
agent/                Bun-built TypeScript agent (compiled to a Linux binary)
prisma/               schema + migrations
games/                per-game compose generators
```

## Environment variables

```bash
# Postgres (Neon)
DATABASE_URL=
DIRECT_URL=               # pooled vs direct for Prisma migrate

# Vercel KV / Upstash Redis
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Vercel Blob (snapshot agent binary)
BLOB_READ_WRITE_TOKEN=

# Vercel Deployment Protection bypass (auto-injected when you enable
# "Protection Bypass for Automation" in project settings). Required so
# the snapshot-builder VM can fetch the agent binary past the auth wall.
VERCEL_AUTOMATION_BYPASS_SECRET=

# Secrets (32+ char random strings)
BOOTSTRAP_JWT_SECRET=
BETTER_AUTH_SECRET=

# URLs
BETTER_AUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Optional
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
```

Hetzner Cloud tokens are stored per-user, encrypted in Postgres, via `/dashboard/account/backend`.

## Setup

1. Provision Neon (Postgres), Vercel KV / Upstash (Redis), and Vercel Blob; populate the env vars above.
2. In Vercel project settings, enable **Deployment Protection → Protection Bypass for Automation**. The generated value is auto-injected as `VERCEL_AUTOMATION_BYPASS_SECRET`.
3. Run `bun migrate` (creates a new migration in `prisma/migrations/` and applies it).
4. Deploy to Vercel.

Each user then signs in, saves a Hetzner Cloud token on `/dashboard/account/backend`, and clicks **Build snapshot** to bake their golden image (~10–15 min).

> [!NOTE]
> New Hetzner Cloud accounts are capped at 5 servers per project until the account is verified. Provisioning fails with `resource_limit_exceeded` once you hit it — request a limit increase from Hetzner support.

### Adding a new game

Add `docker pull <image>` lines to `lib/workflows/build-snapshot-cloud-init.ts`, redeploy, and click **Build snapshot** again.

## Scripts

- `bun dev` — Next dev server (turbopack)
- `bun run build` — prisma generate + next build
- `bun migrate` / `bun db:studio`
- `bun agent:dev` — run agent locally with Bun
- `bun agent:build` — cross-compile Linux binary to `dist/ghost-agent`

## License

MIT — see `license.md`.
