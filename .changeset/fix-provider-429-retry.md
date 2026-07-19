---
"ghost": patch
---

Stop treating Hetzner 429 rate limits as permanent failures during VM creation — the adopt-or-fatal branch matched every 4xx, so a transient rate limit during provision or wake marked the server permanently failed; 429 now rethrows as retryable
