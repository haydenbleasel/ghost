---
"ghost": patch
---

Scope the Hetzner builder snapshot's `description` field by `SNAPSHOT_ENVIRONMENT` (`ghost-gold-production`, `ghost-gold-preview-<branch>`, `ghost-gold-development`) instead of a shared `ghost-gold` literal. The labels already scoped which snapshot a deployment uses for provisioning; this aligns the human-readable description so production / preview / local images are easy to tell apart in the Hetzner dashboard and won't be confused for one another during cleanup.
