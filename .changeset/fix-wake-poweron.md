---
"ghost": patch
---

Power on a surviving VM when waking after a failed hibernation — the wake workflow reused the powered-off VM but nothing ever powered it on, so every wake attempt timed out and the server was stuck until deleted
