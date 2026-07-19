---
"ghost": patch
---

Make agent enrollment survive a lost response — one dropped enroll reply used to brick the VM forever (each retry generated a fresh keypair and hit "Token already used" in a fatal loop, forcing server deletion); the agent now persists its keypair before the enroll POST and the server replays the success idempotently when a burned token arrives with the already-enrolled public key
