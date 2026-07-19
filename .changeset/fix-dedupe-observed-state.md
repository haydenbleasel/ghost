---
"ghost": patch
---

Apply the observed-state transition when a retried agent event dedupes — if the first attempt crashed between inserting the event and updating the server row, the retry's duplicate hit returned early and the server was stuck showing "running" after the game had stopped (also breaking the hibernation stop drain); the dedupe path now falls through to the state update
