---
"ghost": patch
---

Prevent a second hibernation from starting mid-hibernation — after the stop drain the agent's "stopped" event made the server claimable again, so another Hibernate click launched a concurrent workflow that could create a duplicate billed snapshot and end a successful hibernation in "failed"; the claim now requires a non-hibernating desired state, and the workflow re-asserts "hibernating" after the drain so the UI no longer offers Start against a VM being shut down
