# ghost

## 1.1.1

### Patch Changes

- [#48](https://github.com/haydenbleasel/ghost/pull/48) [`e12b9e0`](https://github.com/haydenbleasel/ghost/commit/e12b9e0ff7d1b0a56f61f7739f8bd16ce0507b3e) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Fix `Server.observedState` not transitioning when the agent runs a `STOP` or `START`. Previously the agent emitted a `phase: "stopped"` activity event after `docker compose stop`, but nothing reconciled `Server.observedState` from the activity stream — so the badge stayed on `"running"` and users saw "the server does not stop" even though it had. `emitActivity` now updates `Server.observedState` for the agent-driven steady-state phases (`stopped` → `"stopped"`, `healthy` → `"running"`); the provisioning workflow continues to own its own transitions. The `START` handler now also enqueues a `healthy` event after `composeUp()` so the badge flips back to `"running"`, the agent's `STOP` handler kills the log tail _after_ `composeStop()` so container shutdown messages reach the Console tab, and `executeCommand` logs start/success/failure so the agent's process console is no longer silent. Also disables the Delete menu item once `desiredState` is `"deleted"` so users can't re-trigger teardown on a server that's already being deleted.

- [#48](https://github.com/haydenbleasel/ghost/pull/48) [`e12b9e0`](https://github.com/haydenbleasel/ghost/commit/e12b9e0ff7d1b0a56f61f7739f8bd16ce0507b3e) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Refresh marketing branding: new logo, Geist Pixel display font, redesigned homepage, and updated favicon and Open Graph image.

- [#48](https://github.com/haydenbleasel/ghost/pull/48) [`e12b9e0`](https://github.com/haydenbleasel/ghost/commit/e12b9e0ff7d1b0a56f61f7739f8bd16ce0507b3e) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Scope the Hetzner builder snapshot's `description` field by `SNAPSHOT_ENVIRONMENT` (`ghost-gold-production`, `ghost-gold-preview-<branch>`, `ghost-gold-development`) instead of a shared `ghost-gold` literal. The labels already scoped which snapshot a deployment uses for provisioning; this aligns the human-readable description so production / preview / local images are easy to tell apart in the Hetzner dashboard and won't be confused for one another during cleanup.

- [#48](https://github.com/haydenbleasel/ghost/pull/48) [`e12b9e0`](https://github.com/haydenbleasel/ghost/commit/e12b9e0ff7d1b0a56f61f7739f8bd16ce0507b3e) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Replace `Promise.race(hook, sleep, ...)` blocks in `provisionServer` with polling loops that read state from the database. Eliminates the `Workflow run completed with N uncommitted operation(s): sleep` warnings emitted when hooks won the race and left orphan timers ticking on the backend. Cancellation now propagates through `desiredState` polling (worst-case latency: one poll interval — 6s during boot/enroll, 10s during install) instead of a hook, and the install wait reads the latest agent-reported phase from `activity_events` instead of subscribing to the phase hook.

## 1.1.0

### Minor Changes

- [#47](https://github.com/haydenbleasel/ghost/pull/47) [`6080d27`](https://github.com/haydenbleasel/ghost/commit/6080d27c1f851d93c93df604c0450932eca5836c) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Add support for Counter-Strike 2 dedicated servers. Configurable game mode, starting map, max players, bot quota and difficulty, LAN mode, and Steam GSLT for public servers.

- [#47](https://github.com/haydenbleasel/ghost/pull/47) [`6080d27`](https://github.com/haydenbleasel/ghost/commit/6080d27c1f851d93c93df604c0450932eca5836c) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Add support for Don't Starve Together dedicated servers. Configurable game mode, server intention, max players, PvP, and Klei cluster token.

- [#47](https://github.com/haydenbleasel/ghost/pull/47) [`6080d27`](https://github.com/haydenbleasel/ghost/commit/6080d27c1f851d93c93df604c0450932eca5836c) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Add support for Satisfactory dedicated servers.

- [#47](https://github.com/haydenbleasel/ghost/pull/47) [`6080d27`](https://github.com/haydenbleasel/ghost/commit/6080d27c1f851d93c93df604c0450932eca5836c) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Add support for V Rising dedicated servers.

### Patch Changes

- [`743f3c0`](https://github.com/haydenbleasel/ghost/commit/743f3c03315d55c8687d3c9d1a91c5acbd279393) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Pin `zod` to `4.3.6` to match the version expected by `@workflow/world` and `@workflow/world-vercel`. Zod 4.4 changed how discriminated unions handle fields overridden with `z.undefined()` via `.extend()`, causing the workflow runtime to throw `Schema validation failed for POST /v3/runs/.../events` on every callback and leaving runs wedged in the `pending` state.

## 1.0.0

### Major Changes

- [`fe9c356`](https://github.com/haydenbleasel/ghost/commit/fe9c356a154b1b23fa1e70820a073637c2f21813) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Initial release
