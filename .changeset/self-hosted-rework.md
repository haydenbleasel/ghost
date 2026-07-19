---
"ghost": major
---

Rework Ghost from a hosted multi-tenant platform into a self-hosted, single-tenant deployment you run on your own Vercel account.

**Breaking: this release requires a fresh deployment.** The database schema is incompatible with 1.x (migrations were squashed to a new baseline) and the auth/credential model changed entirely.

- **Deploy your own** — the README now leads with a Vercel Deploy Button that clones the repo, provisions Neon Postgres, Upstash Redis, and Vercel Blob, and prompts for three secrets: `HETZNER_API_TOKEN`, `AUTH_PASSWORD`, and `GHOST_SECRET`.
- **Env-credential auth** — Better Auth is removed (along with sign-up, passkeys, profiles, and avatars). The owner signs in with `AUTH_EMAIL` / `AUTH_PASSWORD` from the environment; sessions are a jose-signed JWT cookie verified fully in the edge middleware.
- **Hetzner token from the environment** — `HETZNER_API_TOKEN` replaces the per-user encrypted token that previously lived in Postgres, and the token-management UI is gone.
- **Single-tenant schema** — the `User`, `Session`, `Account`, `Verification`, and `Passkey` models are dropped; `userId` scoping is removed from servers and snapshot builds; golden images are keyed per deployment environment.
- **One signing secret** — `GHOST_SECRET` replaces `BETTER_AUTH_SECRET`, `SESSION_SECRET`, and `BOOTSTRAP_JWT_SECRET`; each token type keeps its own issuer/audience pair.
- **App at root** — the dashboard now lives at `/` (with `/new`, `/account`, `/[id]`); the marketing site is removed and its content (features, supported games, how-it-works, animated logo) moved into the README.
- **Leaner by default** — Sentry, PostHog, and Google Analytics are removed, along with Dependabot; React Compiler is enabled; all dependencies bumped (and zod unpinned now that `@workflow/world` no longer requires an exact version).

**Reconnecting servers created by a 1.x instance.** Your VMs live in your own Hetzner account, so retiring the old control plane doesn't stop the games — players stay connected and nothing is deleted. But 2.0 starts with a fresh database, so those servers won't appear in your new dashboard. To move a world across:

1. **Copy the game data off the old VM.** Open the VM's console in the [Hetzner Cloud dashboard](https://console.hetzner.cloud) (or SSH if you added a key) and archive the game's data directory: `tar -czf /root/world.tar.gz -C /var/lib/ghost/game/data .` — then get the archive somewhere fetchable (e.g. `scp` it off, or upload it to any file host).
2. **Create a replacement server** for the same game on your new instance and let it provision.
3. **Restore the data.** Stop the new server from the dashboard, open the new VM's Hetzner console, and extract the archive over the data directory: `curl -L <archive-url> | tar -xz -C /var/lib/ghost/game/data` — then start the server again. (For a handful of individual files, the dashboard's **Files** tab can upload them directly instead.)
4. **Delete the old VM** from the Hetzner console once you've confirmed the world came across, so it stops billing. Old VMs are harmless in the meantime — their agents just long-poll the retired control-plane URL and get nothing.

If you'd rather start fresh, step 4 is the only one you need.
