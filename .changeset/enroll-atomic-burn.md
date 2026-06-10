---
"ghost": patch
---

Make agent enrollment atomic. The bootstrap token was burned in a transaction but the agent row was created after it committed, so a transient create failure left the token burned with no agent — the VM's retries then hit "Token already used" forever and the server had to be re-provisioned. The burn is now a conditional update inside the same transaction as the create, which also closes the race where two concurrent requests could both pass the burned-token check.
