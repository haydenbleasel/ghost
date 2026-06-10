---
"ghost": patch
---

Stop leaking snapshot images on failed builds. The image id is now persisted to the build row immediately after `create_image` (making the step retry-safe), and the build failure handler deletes any image that never reached "ready" instead of leaving a per-GB-billed orphan snapshot behind.
