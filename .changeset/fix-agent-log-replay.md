---
"ghost": patch
---

Stop replaying the last 200 historical log lines on every start/restart — the log tail now follows from the triggering command's start time, so old lines no longer reappear in the console with fresh sequence numbers
