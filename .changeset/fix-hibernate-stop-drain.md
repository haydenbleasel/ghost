---
"ghost": patch
---

Fix hibernation's stop-drain never detecting that the game stopped — the workflow polled a phase value that nothing ever set, always burning the full window and risking an ACPI shutdown mid-world-save; it now watches observed state and waits for the agent-reported stop
