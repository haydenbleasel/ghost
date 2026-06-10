---
"ghost": patch
---

Always validate game settings when creating a server. A request that omitted the `settings` field skipped validation entirely, bypassing required fields like Don't Starve Together's cluster token and provisioning a paid VM that could never start.
