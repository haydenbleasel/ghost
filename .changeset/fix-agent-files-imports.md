---
"ghost": patch
---

Fix every agent file command (list, delete, install-from-URL) crashing with a ReferenceError — agent/src/files.ts used node:path helpers it never imported; the agent package is now included in the repo typecheck so this class of bug can't ship again
