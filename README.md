# Ghost

Open-source control plane for dedicated game servers. Next.js on Vercel, game VMs on Hetzner Cloud, coordinated via a tiny `ghost-agent` that runs on each VM.

MVP supports Minecraft. Clean provisioning activity logs, live console streaming, start/stop/restart/delete — no SSH, no Kubernetes, no Pterodactyl.

## Architecture

```
Browser ──SSE──▶ Next.js (Vercel) ──long-poll──▶ ghost-agent (Hetzner VM)
                     │                                 │
                     ├── Prisma → Neon Postgres        └── Docker → game container
                     ├── Upstash Redis (event seq)
                     └── Workflow SDK (durable steps)
```

- **Vercel Workflow SDK** (`workflow`) runs the durable provisioning + teardown workflows. Steps emit structured activity events that the UI streams via SSE.
- **Hetzner VMs** are created from a prebaked snapshot (Docker + `ghost-agent` preinstalled). `cloud-init` only writes a per-server bootstrap token.
- **Agent protocol** — Ed25519-signed requests, long-poll for commands, batched event/log POSTs. The agent never accepts inbound connections.
- **Auth** — Better Auth (email + password to start) on the same Postgres.

## Layout

```
app/                  Next.js App Router — UI, API, Better Auth
lib/                  server-side libs (db, redis, hetzner, agent helpers, workflows)
protocol/             Zod schemas + signing canonicalization shared with the agent
agent/                Bun-built TypeScript agent (compiled to a Linux binary)
prisma/               schema + migrations
scripts/              gold-image build script, systemd unit, cloud-init example
games/                per-game compose generators (Minecraft only enabled in MVP)
```

## Environment variables

```bash
# Postgres (Neon)
DATABASE_URL=
DIRECT_URL=               # pooled vs direct for Prisma migrate

# Vercel KV / Upstash Redis (monotonic event sequence + nonce dedupe)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Hetzner Cloud — per-user, set in /dashboard/account.
# (The gold-image build script reads HETZNER_TOKEN and HETZNER_SSH_KEY
# from .env.local — see "Building the gold image" below.)

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

## One-time setup

1. **Neon** — create a Postgres database, set `DATABASE_URL`.
2. **Vercel KV / Upstash** — create a Redis database, set `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
3. **Vercel Blob** — create a Blob store, set `BLOB_READ_WRITE_TOKEN`.
4. **Prisma** — `bun migrate` (runs `prisma format && prisma generate && prisma db push`).
5. **Deploy** the Next.js app to Vercel with the env vars above.

Each user then signs in, saves their own Hetzner token on `/dashboard/account/backend`, and clicks **Build snapshot** — the `buildSnapshot` workflow compiles the agent in a Vercel Sandbox, uploads it to Blob, spins up a throwaway Hetzner VM whose cloud-init pulls the binary and pre-pulls every game's Docker image, snapshots it, and writes the new image ID onto the user's row.

## Building the gold image

Triggered from the UI, not the CLI. The flow:

1. **Click "Build snapshot"** on `/dashboard/account/backend` (requires a saved Hetzner token).
2. `stepCompileAgent` boots a Vercel Sandbox at the current `VERCEL_GIT_COMMIT_SHA`, runs `bun install` + `bun run agent:build`, uploads `dist/ghost-agent` to Vercel Blob (private), and mints a short-lived JWT for `GET /api/snapshot/agent-binary`.
3. `stepCreateBuilderVm` POSTs to Hetzner with cloud-init userData that curls the binary, installs Docker + UFW baseline, pre-pulls every game image, and `shutdown -h now`s.
4. The workflow polls until the VM reaches `off`, calls `create_image`, polls until the image is `available`, writes the new ID onto `User.hetznerImageId`, deletes the builder, and deletes the previous snapshot.

The whole run takes ~10–15 min. Watch it live with `bun workflow:ui`, or in the panel itself (status indicator + 2 s polling). Concurrent builds for the same user are blocked by `User.activeSnapshotBuildId @unique`.

### Adding more games later

Add `docker pull <image>` lines to `lib/workflows/build-snapshot-cloud-init.ts`, redeploy, and click **Build snapshot** again.

## Lifecycle

- **Create** — `POST /api/servers { name, game: 'minecraft' }` runs the `provisionServer` workflow: mint bootstrap JWT → Hetzner create → await boot → await agent enroll → push `UPDATE_CONFIG` compose → await `healthy` → mark `ready`.
- **Start/Stop/Restart** — `POST /api/servers/:id/commands` enqueues a command. The agent picks it up within ~1s via long-poll, executes `docker compose up/stop/restart`, and acks.
- **Delete** — `DELETE /api/servers/:id` flips `desiredState=deleted` and starts the `teardownServer` workflow: send DELETE to agent → delete Hetzner server → mark deleted.
- **Activity stream** — `GET /api/servers/:id/activity/stream` (SSE). Cursor via `?cursor=<seq>`; auto-closes at 270s so the client reconnects cleanly.
- **Logs stream** — `GET /api/servers/:id/logs/stream` (SSE). Ring-buffered in Postgres (prune via cron).

## Agent protocol

- `POST /api/agent/enroll` — exchanges a one-shot bootstrap JWT (minted by the workflow, written to `/etc/ghost/bootstrap.json` by cloud-init) for a persistent Ed25519 public key registration.
- All subsequent agent calls carry `X-Ghost-{Agent,Ts,Nonce,Sig}` headers. Sig is `ed25519(method || path || ts || nonce || body)`. Timestamp skew tolerance: 60s. Nonce TTL: 5 min.
- `GET /api/agent/commands?wait=25` — long-poll up to 25s (DB polling interval ~750ms). Returns `{commands: []}` or 204.
- `POST /api/agent/commands/:id/ack`, `POST /api/agent/events`, `POST /api/agent/heartbeat`, `POST /api/agent/rotate-key`.

## Scripts

- `bun dev` — Next dev server with turbopack
- `bun run build` — prisma generate + next build
- `bun db:push` / `db:migrate` / `db:studio`
- `bun agent:dev` — run agent with Bun for local testing
- `bun agent:build` — cross-compile Linux binary to `dist/ghost-agent`

## License

MIT — see `license.md`.
