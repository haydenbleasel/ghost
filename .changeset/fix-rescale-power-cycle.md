---
"ghost": patch
---

Make rescale actually work — Hetzner's change_type requires the VM powered off, but a "stopped" Ghost server only has its game container stopped, so every rescale attempt failed with a provider error; rescaling now runs as a workflow that gracefully powers the VM off (hard poweroff as fallback), changes the type, and boots it back up, with an atomic claim so it can't race a double-click or an in-flight hibernation
