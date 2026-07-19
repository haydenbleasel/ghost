---
"ghost": patch
---

Apply settings saved while a server is stopped: Start now sends the freshly built compose file (UPDATE_CONFIG) instead of a bare START, so the server always boots with the latest settings instead of silently reusing the stale compose on disk
