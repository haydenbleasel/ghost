---
"ghost": patch
---

Fix the Hibernate action doing nothing on running or stopped servers — the confirmation dialog was only mounted while provisioning, so hibernation was unreachable from the UI in exactly the states where it is allowed
