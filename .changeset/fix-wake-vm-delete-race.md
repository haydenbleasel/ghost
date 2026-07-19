---
"ghost": patch
---

Stop a deletion racing a wake (or provision retry) from leaking a billed VM — the wake step persisted the restored VM's id without checking that the server hadn't been deleted mid-create, and the provision step's cancelled path never reaped a VM known only by its reserved name; both now mirror the guarded persist-then-cleanup pattern so the orphan is deleted
