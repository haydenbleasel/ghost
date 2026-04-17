# Ultrabeam

Open-source control plane for dedicated game servers. Next.js on Vercel, game VMs on Hetzner Cloud, coordinated via a tiny `ultrabeam-agent` that runs on each VM.

MVP supports Minecraft. Clean provisioning activity logs, live console streaming, start/stop/restart/delete — no SSH, no Kubernetes, no Pterodactyl.

## Architecture

```
Browser ──SSE──▶ Next.js (Vercel) ──long-poll──▶ ultrabeam-agent (Hetzner VM)
                     │                                 │
                     ├── Prisma → Neon Postgres        └── Docker → game container
                     ├── Upstash Redis (event seq)
                     └── Workflow SDK (durable steps)
```

- **Vercel Workflow SDK** (`workflow`) runs the durable provisioning + teardown workflows. Steps emit structured activity events that the UI streams via SSE.
- **Hetzner VMs** are created from a prebaked snapshot (Docker + `ultrabeam-agent` preinstalled). `cloud-init` only writes a per-server bootstrap token.
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

# Upstash Redis (used for monotonic event sequence + nonce dedupe)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

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
2. **Upstash** — create a Redis database, set the REST URL/token.
3. **Prisma** — `pnpm db:push` (dev) or `pnpm db:migrate` for prod.
4. **Build the gold image**:
   - `cd agent && bun install && bun run build` — writes `dist/ultrabeam-agent` (Linux x86_64).
   - Spin up a throwaway Hetzner Ubuntu 24.04 server.
   - `scp dist/ultrabeam-agent scripts/ultrabeam-agent.service scripts/build-image.sh root@<ip>:/` then `ssh root@<ip> 'bash /build-image.sh'`.
   - `ssh root@<ip> shutdown -h now` → `hcloud image create --type snapshot --server <id> --description ultrabeam-gold`.
   - Capture the snapshot id into `HETZNER_IMAGE_ID`.
5. **Deploy** the Next.js app to Vercel with the env vars above.

## Lifecycle

- **Create** — `POST /api/servers { name, game: 'minecraft' }` runs the `provisionServer` workflow: mint bootstrap JWT → Hetzner create → await boot → await agent enroll → push `UPDATE_CONFIG` compose → await `healthy` → mark `ready`.
- **Start/Stop/Restart** — `POST /api/servers/:id/commands` enqueues a command. The agent picks it up within ~1s via long-poll, executes `docker compose up/stop/restart`, and acks.
- **Delete** — `DELETE /api/servers/:id` flips `desiredState=deleted` and starts the `teardownServer` workflow: send DELETE to agent → delete Hetzner server → mark deleted.
- **Activity stream** — `GET /api/servers/:id/activity/stream` (SSE). Cursor via `?cursor=<seq>`, auto-close at 270s so client can reconnect cleanly.
- **Logs stream** — `GET /api/servers/:id/logs/stream` (SSE). Ring-buffered in Postgres (prune via cron).

## Agent protocol

- `POST /api/agent/enroll` — exchanges a one-shot bootstrap JWT (minted by the workflow, written to `/etc/ultrabeam/bootstrap.json` by cloud-init) for a persistent Ed25519 public key registration.
- All subsequent agent calls carry `X-Ultrabeam-{Agent,Ts,Nonce,Sig}` headers. Sig is `ed25519(method || path || ts || nonce || body)`. Timestamp skew tolerance: 60s. Nonce TTL: 5 min.
- `GET /api/agent/commands?wait=25` — long-poll, up to 25s DB polling interval ~750ms. Returns `{commands: []}` or 204.
- `POST /api/agent/commands/:id/ack`, `POST /api/agent/events`, `POST /api/agent/heartbeat`, `POST /api/agent/rotate-key`.

## Scripts

- `pnpm dev` — Next dev server with turbopack
- `pnpm build` — prisma generate + next build
- `pnpm db:push` / `db:migrate` / `db:studio`
- `pnpm agent:dev` — run agent with Bun for local testing
- `pnpm agent:build` — cross-compile Linux binary to `dist/ultrabeam-agent`

## License

MIT — see `license.md`.
