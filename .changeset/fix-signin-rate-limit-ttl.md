---
"ghost": patch
---

Prevent the sign-in failure counter from becoming immortal when its expiry write is missed — the TTL is now refreshed on every failure, so a stale counter can no longer lock the owner out permanently
