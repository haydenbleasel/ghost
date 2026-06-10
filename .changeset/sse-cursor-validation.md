---
"ghost": patch
---

Validate the `cursor` query parameter on the activity and log SSE streams. A non-numeric cursor became `NaN`, flowed into Prisma as `seq: { gt: NaN }`, and errored the stream immediately; it now falls back to 0.
