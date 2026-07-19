---
"ghost": patch
---

Start the game after waking from hibernation — the container is stopped manually before the snapshot, so Docker's `unless-stopped` policy never brings it back on the restored VM; the wake workflow reported "running" while the game was down and the Start button was disabled. Wake now sends a fresh compose (UPDATE_CONFIG) once the agent reconnects, which also applies settings saved while hibernated
