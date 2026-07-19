---
"ghost": patch
---

Recover snapshot builds whose builder-VM create response was lost — the retry's unique-name conflict was turned straight into a fatal build failure, stranding a billed `ghost-builder-*` VM that nothing tracked or deleted; the step now adopts the existing VM by its deterministic name, and transient 429 rate limits retry instead of failing the build
