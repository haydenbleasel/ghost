---
"ghost": patch
---

Show the loading state while switching metric ranges on the Graphs tab — the aborted previous request was clearing the loading flag for the new in-flight one, so charts kept rendering old-range data with the new range's axis formatting until the fetch landed
