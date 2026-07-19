---
"ghost": patch
---

Prevent concurrent agent state saves from racing on a shared temp file, which could crash a just-executed command or corrupt state.json and brick the agent on next boot; saves are now serialized and use unique temp files
