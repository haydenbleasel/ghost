---
"ghost": patch
---

Don't permanently block snapshot builds when the workflow fails to start. The build row was committed as "pending" before `start(buildSnapshot, …)`; if the start threw, the row stayed non-terminal and the "already running" guard rejected every future build for that user. The row is now marked "failed" when the workflow can't be started.
