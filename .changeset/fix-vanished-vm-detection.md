---
"ghost": patch
---

Distinguish a truly deleted VM (provider 404) from Hetzner's transient 'unknown' server status — a transient 'unknown' during wake or hibernate could drop the reference to a live, billed VM and orphan it
