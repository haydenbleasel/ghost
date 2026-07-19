---
"ghost": patch
---

Make VM creation crash-safe: the VM name is reserved in the database before calling the provider, so a retried create adopts the existing VM via a unique-name conflict instead of silently creating (and billing) a second untracked one, and teardown reaps VMs known only by their reserved name
