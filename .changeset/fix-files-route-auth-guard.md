---
"ghost": patch
---

Fix the files API auth guard silently discarding its 401 — the unauthorized branch returned a bare response that the `"error" in owned` check never matched, so once unauthenticated API requests reach routes (middleware no longer redirects them) the handler would have fallen through and allowed unauthenticated file listing and deletion
