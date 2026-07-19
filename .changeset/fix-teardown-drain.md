---
"ghost": patch
---

Fix server deletion always stalling for the full 120-second drain window — the workflow polled a phase value that nothing ever set; it now watches for the agent's own 'deleting' event and proceeds as soon as the drain completes
