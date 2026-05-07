---
"ghost": patch
---

Pin `zod` to `4.3.6` to match the version expected by `@workflow/world` and `@workflow/world-vercel`. Zod 4.4 changed how discriminated unions handle fields overridden with `z.undefined()` via `.extend()`, causing the workflow runtime to throw `Schema validation failed for POST /v3/runs/.../events` on every callback and leaving runs wedged in the `pending` state.
