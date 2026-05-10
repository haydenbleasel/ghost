---
"ghost": patch
---

Regenerate the Hetzner OpenAPI types. Picks up `@deprecated` markers on the singular `get_<resource>_action` endpoints (per the [2026-04-30 changelog](https://docs.hetzner.cloud/changelog#2026-04-30-deprecate-get-resource-action-endpoints)), the Load Balancer service/target type split, the primary/secondary Zone schema split, and per-location pricing breakdowns. None of the endpoints we call were affected.
