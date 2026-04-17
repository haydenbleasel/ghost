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

# Hetzner Cloud
HETZNER_TOKEN=            # read/write token from Hetzner console
HETZNER_IMAGE_ID=         # snapshot id produced by scripts/build-image.sh
HETZNER_LOCATION=nbg1
HETZNER_SERVER_TYPE=cx22

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
3. **Prisma** — `pnpm migrate` (runs `prisma format && prisma generate && prisma db push`).
4. **Build the gold image** — see [Building the gold image](#building-the-gold-image) below.
5. **Deploy** the Next.js app to Vercel with the env vars above.

## Building the gold image

One-time ~10 min process on Hetzner. Produces a snapshot with Ubuntu + Docker + `ghost-agent` + the game's Docker image pre-pulled, so first provision is instant.

### Prereqs

```bash
brew install hcloud
hcloud context create ghost                  # paste your HETZNER_TOKEN
hcloud ssh-key create --name laptop --public-key-from-file ~/.ssh/id_ed25519.pub
```

### 1. Compile the agent binary

```bash
pnpm agent:build
# → dist/ghost-agent  (Linux x86_64, ~100 MB)
```

### 2. Spin up a throwaway builder VM

```bash
hcloud server create \
  --name ghost-image-builder \
  --type cx22 \
  --image ubuntu-24.04 \
  --location nbg1 \
  --ssh-key laptop

BUILDER_IP=$(hcloud server ip ghost-image-builder)
ssh -o StrictHostKeyChecking=accept-new root@$BUILDER_IP 'echo ok'
```

### 3. Copy the agent + scripts onto it

```bash
scp dist/ghost-agent             root@$BUILDER_IP:/usr/local/bin/
scp scripts/ghost-agent.service  root@$BUILDER_IP:/etc/systemd/system/
scp scripts/build-image.sh           root@$BUILDER_IP:/root/
ssh root@$BUILDER_IP 'chmod +x /usr/local/bin/ghost-agent /root/build-image.sh'
```

### 4. Run the build script

```bash
ssh root@$BUILDER_IP 'bash /root/build-image.sh'
```

Installs Docker, enables the agent systemd unit, opens port 22, and pre-pulls `itzg/minecraft-server:latest`. Takes 2–3 min.

### 5. Shut down and snapshot

```bash
hcloud server shutdown ghost-image-builder
# wait until status = off (~20s)
hcloud server describe ghost-image-builder -o format='{{.Status}}'

hcloud server create-image \
  --type snapshot \
  --description ghost-gold-minecraft \
  ghost-image-builder
```

Grab the snapshot ID from the output (or `hcloud image list --type snapshot`).

### 6. Wire it up and nuke the builder

```bash
echo "HETZNER_IMAGE_ID=<snapshot-id>" >> .env
hcloud server delete ghost-image-builder
```

### Adding more games later

Add `docker pull <image>` lines to `scripts/build-image.sh`, rebuild the snapshot (steps 2–5), and bump `HETZNER_IMAGE_ID`. Same snapshot shape, more images pre-baked.

## Lifecycle

- **Create** — `POST /api/servers { name, game: 'minecraft' }` runs the `provisionServer` workflow: mint bootstrap JWT → Hetzner create → await boot → await agent enroll → push `UPDATE_CONFIG` compose → await `healthy` → mark `ready`.
- **Start/Stop/Restart** — `POST /api/servers/:id/commands` enqueues a command. The agent picks it up within ~1s via long-poll, executes `docker compose up/stop/restart`, and acks.
- **Delete** — `DELETE /api/servers/:id` flips `desiredState=deleted` and starts the `teardownServer` workflow: send DELETE to agent → delete Hetzner server → mark deleted.
- **Activity stream** — `GET /api/servers/:id/activity/stream` (SSE). Cursor via `?cursor=<seq>`, auto-close at 270s so client can reconnect cleanly.
- **Logs stream** — `GET /api/servers/:id/logs/stream` (SSE). Ring-buffered in Postgres (prune via cron).

## Agent protocol

- `POST /api/agent/enroll` — exchanges a one-shot bootstrap JWT (minted by the workflow, written to `/etc/ghost/bootstrap.json` by cloud-init) for a persistent Ed25519 public key registration.
- All subsequent agent calls carry `X-Ghost-{Agent,Ts,Nonce,Sig}` headers. Sig is `ed25519(method || path || ts || nonce || body)`. Timestamp skew tolerance: 60s. Nonce TTL: 5 min.
- `GET /api/agent/commands?wait=25` — long-poll, up to 25s DB polling interval ~750ms. Returns `{commands: []}` or 204.
- `POST /api/agent/commands/:id/ack`, `POST /api/agent/events`, `POST /api/agent/heartbeat`, `POST /api/agent/rotate-key`.

## Scripts

- `pnpm dev` — Next dev server with turbopack
- `pnpm build` — prisma generate + next build
- `pnpm db:push` / `db:migrate` / `db:studio`
- `pnpm agent:dev` — run agent with Bun for local testing
- `pnpm agent:build` — cross-compile Linux binary to `dist/ghost-agent`

## License

MIT — see `license.md`.
