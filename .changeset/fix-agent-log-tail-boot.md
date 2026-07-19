---
"ghost": patch
---

Re-attach the console log tail when the agent boots with the game already running — after an agent crash or VM reboot the tail only started on the next user-issued start/restart, so the dashboard console silently went dead; the agent now probes the container on boot and tails from boot time (no historical replay)
