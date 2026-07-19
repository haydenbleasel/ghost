---
"ghost": patch
---

Refresh the hardware specs on the Details tab when a rescale lands — previously only the type name ever updated, so cores/memory kept showing the old size until a hard reload; the server poll now rebuilds the specs from the catalog when the server type changes (disk preserved, matching Hetzner's keep-disk rescale)
