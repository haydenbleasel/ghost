---
"ghost": patch
---

Redeliver commands whose delivery or ack was lost in transit — commands were marked delivered before the agent received them with no redelivery path, so a dropped long-poll response left them stuck forever; the agent now dedupes redeliveries against its recent command history
