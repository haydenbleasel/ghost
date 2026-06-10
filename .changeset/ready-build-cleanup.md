---
"ghost": patch
---

Don't mark a successful snapshot build as failed when post-save cleanup hiccups. `stepDeleteBuilder` runs after the snapshot id is saved and the build is "ready", so provider errors while deleting the builder VM are now swallowed (matching `stepDeletePreviousSnapshot`) instead of landing in the catch handler and flipping the build to "failed".
