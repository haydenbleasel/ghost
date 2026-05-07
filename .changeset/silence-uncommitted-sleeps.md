---
"ghost": patch
---

Replace `Promise.race(hook, sleep, ...)` blocks in `provisionServer` with polling loops that read state from the database. Eliminates the `Workflow run completed with N uncommitted operation(s): sleep` warnings emitted when hooks won the race and left orphan timers ticking on the backend. Cancellation now propagates through `desiredState` polling (worst-case latency: one poll interval — 6s during boot/enroll, 10s during install) instead of a hook, and the install wait reads the latest agent-reported phase from `activity_events` instead of subscribing to the phase hook.
