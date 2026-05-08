---
"ghost": patch
---

Fix `Server.observedState` not transitioning when the agent runs a `STOP` or `START`. Previously the agent emitted a `phase: "stopped"` activity event after `docker compose stop`, but nothing reconciled `Server.observedState` from the activity stream — so the badge stayed on `"running"` and users saw "the server does not stop" even though it had. `emitActivity` now updates `Server.observedState` for the agent-driven steady-state phases (`stopped` → `"stopped"`, `healthy` → `"running"`); the provisioning workflow continues to own its own transitions. The `START` handler now also enqueues a `healthy` event after `composeUp()` so the badge flips back to `"running"`, the agent's `STOP` handler kills the log tail _after_ `composeStop()` so container shutdown messages reach the Console tab, and `executeCommand` logs start/success/failure so the agent's process console is no longer silent.
