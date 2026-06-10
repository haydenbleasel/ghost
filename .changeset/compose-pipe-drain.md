---
"ghost": patch
---

Stop `docker compose` invocations from hanging the agent. The subprocess was spawned with piped stdout/stderr that were never read, so any compose command producing more than the OS pipe buffer (~64KB, easily hit by image-pull progress) blocked forever with no timeout. Both pipes are now drained while awaiting exit, and compose failures include the last stderr line for easier debugging.
