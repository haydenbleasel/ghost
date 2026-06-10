---
"ghost": patch
---

Make snapshot builder VM creation idempotent. `stepCreateBuilderVm` now returns the already-persisted `providerBuilderId` on retry instead of creating another VM, and the builder name is derived deterministically from the build id so a retried create whose first response was lost is rejected by the provider's unique-name constraint rather than silently billing a second orphaned VM.
