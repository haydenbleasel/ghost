---
"ghost": patch
---

Block symlink path traversal in agent file operations. `resolveInRoot` only normalized the path string, so a symlink planted inside the bind-mounted data root by a compromised game container could redirect `FILES_INSTALL_FROM_URL`/`FILES_DELETE` writes outside the root (the agent runs as root on the host). Paths are now resolved through `realpath` on their deepest existing ancestor and re-verified against the real data root before any read, write, or delete.
