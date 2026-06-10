---
"ghost": patch
---

Fetch all pages when listing a server's backups and snapshots. `listImagesForServer` requested a single page of 50 images for the whole account and filtered client-side, so servers on accounts with more than 50 images silently lost backups from the UI. Backups are now filtered server-side via Hetzner's `bound_to` parameter and both listings follow `meta.pagination.next_page` to exhaustion.
