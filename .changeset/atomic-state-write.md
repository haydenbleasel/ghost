---
"ghost": patch
---

Write the agent's state file atomically. `saveState` wrote a temp file but then copied it into place with a truncate-and-write, so a crash mid-save could leave a corrupt `state.json` that permanently bricked the agent on next boot. The temp file is now swapped in with `rename`.
