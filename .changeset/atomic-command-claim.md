---
"ghost": patch
---

Prevent double-delivery of agent commands. `claimPendingCommands` did a find-then-update, so two overlapping long-polls (e.g. an agent retry racing a still-running handler) could both read the same pending rows and execute a command — including destructive ones like `FILES_DELETE` — twice. Each row is now claimed with a conditional update on `status: "pending"`, so exactly one caller wins it.
